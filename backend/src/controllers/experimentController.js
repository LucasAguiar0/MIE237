const pool = require('../config/database');

// ── POST /api/start-session ───────────────────────────────────────────────────
// Body: { name, category_selected, cheat_sheet_used }
// Returns: { userId }
async function startSession(req, res) {
  const { name, category_selected, cheat_sheet_used } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Participant name is required.' });
  }
  if (!['People', 'Landscape'].includes(category_selected)) {
    return res.status(400).json({ error: 'category_selected must be "People" or "Landscape".' });
  }
  if (![0, 1].includes(Number(cheat_sheet_used))) {
    return res.status(400).json({ error: 'cheat_sheet_used must be 0 or 1.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (name, category_selected, cheat_sheet_used)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name.trim(), category_selected, Number(cheat_sheet_used)]
    );
    return res.status(201).json({ userId: result.rows[0].id });
  } catch (err) {
    console.error('startSession error:', err);
    return res.status(500).json({ error: 'Failed to create session.' });
  }
}

// ── GET /api/images?category=People|Landscape ─────────────────────────────────
// Returns all images for the given category in randomized order.
async function getImages(req, res) {
  const { category } = req.query;

  if (!['People', 'Landscape'].includes(category)) {
    return res.status(400).json({ error: 'category must be "People" or "Landscape".' });
  }

  try {
    // ORDER BY RANDOM() ensures a different order each session
    const result = await pool.query(
      `SELECT id, name, category, is_ai, file_path
       FROM images
       WHERE category = $1
       ORDER BY RANDOM()`,
      [category]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No images found for this category.' });
    }

    return res.json({ images: result.rows });
  } catch (err) {
    console.error('getImages error:', err);
    return res.status(500).json({ error: 'Failed to fetch images.' });
  }
}

// ── POST /api/submit-response ─────────────────────────────────────────────────
// Body: { userId, imageId, participant_classification (0|1), reaction_time (ms) }
async function submitResponse(req, res) {
  const { userId, imageId, participant_classification, reaction_time } = req.body;

  const classification = Number(participant_classification);
  const rt = Number(reaction_time);

  if (!userId || !imageId) {
    return res.status(400).json({ error: 'userId and imageId are required.' });
  }
  if (![0, 1].includes(classification)) {
    return res.status(400).json({ error: 'participant_classification must be 0 or 1.' });
  }
  if (!Number.isInteger(rt) || rt < 0) {
    return res.status(400).json({ error: 'reaction_time must be a non-negative integer (ms).' });
  }

  try {
    // Verify user exists and is not completed
    const userCheck = await pool.query(
      'SELECT id, completed FROM users WHERE id = $1',
      [userId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User session not found.' });
    }
    if (userCheck.rows[0].completed) {
      return res.status(409).json({ error: 'Experiment already completed.' });
    }

    // Verify image exists
    const imageCheck = await pool.query(
      'SELECT id, is_ai FROM images WHERE id = $1',
      [imageId]
    );
    if (imageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    // Prevent duplicate responses for same user+image
    const dupCheck = await pool.query(
      'SELECT id FROM responses WHERE user_id = $1 AND image_id = $2',
      [userId, imageId]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Response already recorded for this image.' });
    }

    const isAi = imageCheck.rows[0].is_ai;
    // XNOR logic: correct = 1 if both match, 0 otherwise
    const correct = classification === isAi ? 1 : 0;

    await pool.query(
      `INSERT INTO responses
         (user_id, image_id, participant_classification, correct, reaction_time)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, imageId, classification, correct, rt]
    );

    return res.status(201).json({ correct }); // correct is returned but NOT shown to user in UI
  } catch (err) {
    console.error('submitResponse error:', err);
    return res.status(500).json({ error: 'Failed to record response.' });
  }
}

// ── POST /api/complete-experiment ─────────────────────────────────────────────
// Body: { userId }
// Marks the user's session as completed.
async function completeExperiment(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET completed = TRUE
       WHERE id = $1
       RETURNING id`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User session not found.' });
    }
    return res.json({ message: 'Experiment completed successfully.' });
  } catch (err) {
    console.error('completeExperiment error:', err);
    return res.status(500).json({ error: 'Failed to mark experiment as complete.' });
  }
}

// ── GET /api/cheatsheet ───────────────────────────────────────────────────────
async function getCheatsheet(req, res) {
  try {
    const result = await pool.query('SELECT content FROM cheatsheet ORDER BY id DESC LIMIT 1');
    const content = result.rows.length > 0 ? result.rows[0].content : '';
    return res.json({ content });
  } catch (err) {
    console.error('getCheatsheet error:', err);
    return res.status(500).json({ error: 'Failed to fetch cheat sheet.' });
  }
}

module.exports = {
  startSession,
  getImages,
  submitResponse,
  completeExperiment,
  getCheatsheet,
};
