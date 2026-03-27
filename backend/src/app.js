require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const experimentRoutes = require('./routes/experiment');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// ── Static file serving for uploaded images ───────────────────────────────────
const uploadDir = path.join(__dirname, '../', process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadDir));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', experimentRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`MIE237 Experiment API running on http://localhost:${PORT}`);
});

module.exports = app;
