/**
 * Run this script once to initialize the database schema:
 *   node src/config/initDb.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./database');
const bcrypt = require('bcryptjs');

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Tables ──────────────────────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id           SERIAL PRIMARY KEY,
        username     VARCHAR(100) NOT NULL UNIQUE,
        password_hash TEXT        NOT NULL,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id        SERIAL PRIMARY KEY,
        name      VARCHAR(255) NOT NULL UNIQUE,
        category  VARCHAR(50)  NOT NULL CHECK (category IN ('People','Landscape')),
        is_ai     SMALLINT     NOT NULL CHECK (is_ai IN (0,1)),
        file_path TEXT         NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                SERIAL PRIMARY KEY,
        name              VARCHAR(255) NOT NULL,
        category_selected VARCHAR(50)  NOT NULL CHECK (category_selected IN ('People','Landscape')),
        cheat_sheet_used  SMALLINT     NOT NULL CHECK (cheat_sheet_used IN (0,1)),
        completed         BOOLEAN      DEFAULT FALSE,
        timestamp         TIMESTAMPTZ  DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS responses (
        id                       SERIAL PRIMARY KEY,
        user_id                  INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_id                 INTEGER     NOT NULL REFERENCES images(id) ON DELETE CASCADE,
        participant_classification SMALLINT  NOT NULL CHECK (participant_classification IN (0,1)),
        correct                  SMALLINT    NOT NULL CHECK (correct IN (0,1)),
        reaction_time            INTEGER     NOT NULL,  -- milliseconds
        timestamp                TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cheatsheet (
        id      SERIAL PRIMARY KEY,
        content TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Seed default cheat sheet row ────────────────────────────────────────
    const csCheck = await client.query('SELECT id FROM cheatsheet LIMIT 1');
    if (csCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO cheatsheet (content) VALUES (
          $1
        )
      `, [`Common AI Image Artifacts Checklist:

1. Unnatural skin texture or overly smooth skin
2. Asymmetrical or distorted facial features
3. Strange or melted-looking ears, jewelry, or accessories
4. Blurry or inconsistent background edges
5. Incorrect number of fingers or distorted hands
6. Repeating patterns or textures that look "too perfect"
7. Inconsistent lighting or shadows that don't match the scene
8. Text in the image that is garbled or unreadable
9. Eyes that look glassy, misaligned, or unnatural
10. Objects that partially merge into each other or have unnatural proportions`]);
    }

    // ── Seed default admin ───────────────────────────────────────────────────
    const adminCheck = await client.query('SELECT id FROM admins LIMIT 1');
    if (adminCheck.rows.length === 0) {
      const username = process.env.ADMIN_USERNAME || 'supervisor';
      const password = process.env.ADMIN_PASSWORD || 'changeme123';
      const hash = await bcrypt.hash(password, 12);
      await client.query(
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
        [username, hash]
      );
      console.log(`Default admin created — username: "${username}", password: "${password}"`);
      console.log('IMPORTANT: Change the admin password immediately after first login.');
    }

    await client.query('COMMIT');
    console.log('Database initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDb();
