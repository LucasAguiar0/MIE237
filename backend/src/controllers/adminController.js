const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { Parser } = require('json2csv');
const cloudinary = require('cloudinary').v2;

// ── POST /api/admin/login ─────────────────────────────────────────────────────
async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, password_hash FROM admins WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    req.session.adminId = result.rows[0].id;
    req.session.adminUsername = username;
    return res.json({ message: 'Logged in.', username });
  } catch (err) {
    console.error('admin login error:', err);
    return res.status(500).json({ error: 'Login failed.', detail: err.message });
  }
}

// ── POST /api/admin/logout ────────────────────────────────────────────────────
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out.' });
  });
}

// ── POST /api/admin/change-password ──────────────────────────────────────────
// Body: { currentPassword, newPassword }
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM admins WHERE id = $1',
      [req.session.adminId]
    );
    const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [hash, req.session.adminId]);
    return res.json({ message: 'Password updated.' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
}

// ── POST /api/admin/upload-image ──────────────────────────────────────────────
// multipart/form-data: file + { name, category, is_ai }
async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required.' });
  }
  const { name, category, is_ai } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Image name (ID) is required.' });
  }
  if (!['People', 'Landscape'].includes(category)) {
    return res.status(400).json({ error: 'category must be "People" or "Landscape".' });
  }
  if (![0, 1].includes(Number(is_ai))) {
    return res.status(400).json({ error: 'is_ai must be 0 or 1.' });
  }

  try {
    // req.file.path is the full Cloudinary URL when using multer-storage-cloudinary
    const result = await pool.query(
      `INSERT INTO images (name, category, is_ai, file_path)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), category, Number(is_ai), req.file.path]
    );
    return res.status(201).json({ image: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An image with that name already exists.' });
    }
    console.error('uploadImage error:', err);
    return res.status(500).json({ error: 'Failed to save image.' });
  }
}

// ── GET /api/admin/images ─────────────────────────────────────────────────────
async function listImages(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, category, is_ai, file_path, created_at FROM images ORDER BY category, name'
    );
    return res.json({ images: result.rows });
  } catch (err) {
    console.error('listImages error:', err);
    return res.status(500).json({ error: 'Failed to fetch images.' });
  }
}

// ── DELETE /api/admin/image/:id ───────────────────────────────────────────────
async function deleteImage(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM images WHERE id = $1 RETURNING file_path',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found.' });
    }
    // Delete from Cloudinary (extract public_id from URL)
    try {
      const url = result.rows[0].file_path;
      const parts = url.split('/');
      const folder = parts[parts.length - 2];
      const filename = parts[parts.length - 1].replace(/\.[^/.]+$/, '');
      await cloudinary.uploader.destroy(`${folder}/${filename}`);
    } catch (_) {}
    return res.json({ message: 'Image deleted.' });
  } catch (err) {
    console.error('deleteImage error:', err);
    return res.status(500).json({ error: 'Failed to delete image.' });
  }
}

// ── GET /api/admin/cheatsheet ─────────────────────────────────────────────────
async function getCheatsheet(req, res) {
  try {
    const result = await pool.query('SELECT id, content, updated_at FROM cheatsheet ORDER BY id DESC LIMIT 1');
    return res.json(result.rows[0] || { content: '' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch cheat sheet.' });
  }
}

// ── PUT /api/admin/cheatsheet ─────────────────────────────────────────────────
async function updateCheatsheet(req, res) {
  const { content } = req.body;
  if (content === undefined) {
    return res.status(400).json({ error: 'content is required.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM cheatsheet ORDER BY id DESC LIMIT 1');
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE cheatsheet SET content = $1, updated_at = NOW() WHERE id = $2',
        [content, existing.rows[0].id]
      );
    } else {
      await pool.query('INSERT INTO cheatsheet (content) VALUES ($1)', [content]);
    }
    return res.json({ message: 'Cheat sheet updated.' });
  } catch (err) {
    console.error('updateCheatsheet error:', err);
    return res.status(500).json({ error: 'Failed to update cheat sheet.' });
  }
}

// ── GET /api/admin/results ────────────────────────────────────────────────────
// Returns all participants with their response counts and aggregate stats
async function getResults(req, res) {
  try {
    const participants = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.category_selected,
        u.cheat_sheet_used,
        u.completed,
        u.timestamp,
        COUNT(r.id)::INT                              AS total_responses,
        COALESCE(SUM(r.correct), 0)::INT              AS total_correct,
        CASE WHEN COUNT(r.id) > 0
             THEN ROUND((SUM(r.correct)::NUMERIC / COUNT(r.id)) * 100, 1)
             ELSE 0 END                               AS accuracy_pct,
        COALESCE(ROUND(AVG(r.reaction_time))::INT, 0) AS mean_reaction_time_ms
      FROM users u
      LEFT JOIN responses r ON r.user_id = u.id
      GROUP BY u.id
      ORDER BY u.timestamp DESC
    `);

    return res.json({ participants: participants.rows });
  } catch (err) {
    console.error('getResults error:', err);
    return res.status(500).json({ error: 'Failed to fetch results.' });
  }
}

// ── GET /api/admin/results/:userId ───────────────────────────────────────────
// Returns detailed row-by-row data for a single participant
async function getParticipantDetail(req, res) {
  const { userId } = req.params;
  try {
    const user = await pool.query(
      'SELECT id, name, category_selected, cheat_sheet_used, completed, timestamp FROM users WHERE id = $1',
      [userId]
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    const responses = await pool.query(`
      SELECT
        r.id,
        i.name                       AS image_name,
        i.category,
        i.is_ai,
        r.participant_classification,
        r.correct,
        r.reaction_time,
        r.timestamp
      FROM responses r
      JOIN images i ON i.id = r.image_id
      WHERE r.user_id = $1
      ORDER BY r.timestamp ASC
    `, [userId]);

    return res.json({ participant: user.rows[0], responses: responses.rows });
  } catch (err) {
    console.error('getParticipantDetail error:', err);
    return res.status(500).json({ error: 'Failed to fetch participant data.' });
  }
}

// ── GET /api/admin/aggregated-stats ──────────────────────────────────────────
// Counts per condition: category × cheat_sheet
async function getAggregatedStats(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        category_selected,
        cheat_sheet_used,
        COUNT(*)::INT                                          AS participant_count,
        CASE WHEN SUM(total_r) > 0
             THEN ROUND((SUM(correct_r)::NUMERIC / SUM(total_r)) * 100, 1)
             ELSE 0 END                                       AS overall_accuracy_pct,
        COALESCE(ROUND(AVG(mean_rt))::INT, 0)                AS mean_reaction_time_ms
      FROM (
        SELECT
          u.category_selected,
          u.cheat_sheet_used,
          COUNT(r.id)           AS total_r,
          SUM(r.correct)        AS correct_r,
          AVG(r.reaction_time)  AS mean_rt
        FROM users u
        LEFT JOIN responses r ON r.user_id = u.id
        WHERE u.completed = TRUE
        GROUP BY u.id, u.category_selected, u.cheat_sheet_used
      ) sub
      GROUP BY category_selected, cheat_sheet_used
      ORDER BY category_selected, cheat_sheet_used
    `);

    return res.json({ stats: result.rows });
  } catch (err) {
    console.error('getAggregatedStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch aggregated stats.' });
  }
}

// ── GET /api/admin/export/:userId ─────────────────────────────────────────────
// Exports a single participant's data as CSV matching the exact schema
async function exportParticipant(req, res) {
  const { userId } = req.params;
  try {
    const user = await pool.query(
      'SELECT name, category_selected, cheat_sheet_used FROM users WHERE id = $1',
      [userId]
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found.' });
    }
    const { name, category_selected, cheat_sheet_used } = user.rows[0];

    const responses = await pool.query(`
      SELECT
        i.name      AS image_id,
        i.category  AS image_category,
        i.is_ai,
        r.participant_classification,
        r.correct,
        r.reaction_time,
        r.timestamp
      FROM responses r
      JOIN images i ON i.id = r.image_id
      WHERE r.user_id = $1
      ORDER BY r.timestamp ASC
    `, [userId]);

    const rows = responses.rows.map((r) => ({
      'Participant Name':              name,
      'Image Category':                r.image_category,
      'Image ID':                      r.image_id,
      'Is_AI':                         r.is_ai,
      'Participant Classification':     r.participant_classification,
      'Correct':                       r.correct,
      'Cheat Sheet Used':              cheat_sheet_used,
      'Reaction Time (ms)':            r.reaction_time,
      'Timestamp':                     new Date(r.timestamp).toISOString(),
    }));

    const fields = [
      'Participant Name',
      'Image Category',
      'Image ID',
      'Is_AI',
      'Participant Classification',
      'Correct',
      'Cheat Sheet Used',
      'Reaction Time (ms)',
      'Timestamp',
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="participant_${safeName}_${userId}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('exportParticipant error:', err);
    return res.status(500).json({ error: 'Failed to export data.' });
  }
}

// ── GET /api/admin/export-all ─────────────────────────────────────────────────
// Exports ALL responses as one CSV
async function exportAll(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        u.name                          AS "Participant Name",
        i.category                      AS "Image Category",
        i.name                          AS "Image ID",
        i.is_ai                         AS "Is_AI",
        r.participant_classification    AS "Participant Classification",
        r.correct                       AS "Correct",
        u.cheat_sheet_used              AS "Cheat Sheet Used",
        r.reaction_time                 AS "Reaction Time (ms)",
        r.timestamp                     AS "Timestamp"
      FROM responses r
      JOIN users  u ON u.id = r.user_id
      JOIN images i ON i.id = r.image_id
      ORDER BY u.id, r.timestamp ASC
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data to export.' });
    }

    const fields = [
      'Participant Name',
      'Image Category',
      'Image ID',
      'Is_AI',
      'Participant Classification',
      'Correct',
      'Cheat Sheet Used',
      'Reaction Time (ms)',
      'Timestamp',
    ];

    const rows = result.rows.map((r) => ({
      ...r,
      Timestamp: new Date(r.Timestamp).toISOString(),
    }));

    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="all_results.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('exportAll error:', err);
    return res.status(500).json({ error: 'Failed to export all data.' });
  }
}

module.exports = {
  login,
  logout,
  changePassword,
  uploadImage,
  listImages,
  deleteImage,
  getCheatsheet,
  updateCheatsheet,
  getResults,
  getParticipantDetail,
  getAggregatedStats,
  exportParticipant,
  exportAll,
};
