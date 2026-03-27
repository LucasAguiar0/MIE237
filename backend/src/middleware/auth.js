/**
 * Middleware: require an active admin session.
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized — admin login required.' });
}

module.exports = { requireAdmin };
