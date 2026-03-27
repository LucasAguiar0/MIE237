const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

// ── Cloudinary configuration ──────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer + Cloudinary storage ───────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mie237_experiment',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    resource_type: 'image',
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Auth routes (no requireAdmin) ─────────────────────────────────────────────
router.post('/login',   ctrl.login);
router.post('/logout',  ctrl.logout);

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(requireAdmin);

router.post('/change-password',   ctrl.changePassword);

// Images
router.post('/upload-image',      upload.single('image'), ctrl.uploadImage);
router.get('/images',             ctrl.listImages);
router.delete('/image/:id',       ctrl.deleteImage);

// Cheat sheet
router.get('/cheatsheet',         ctrl.getCheatsheet);
router.put('/cheatsheet',         ctrl.updateCheatsheet);

// Results
router.get('/results',            ctrl.getResults);
router.get('/results/:userId',    ctrl.getParticipantDetail);
router.get('/aggregated-stats',   ctrl.getAggregatedStats);

// Export
router.get('/export-all',         ctrl.exportAll);
router.get('/export/:userId',     ctrl.exportParticipant);

module.exports = router;
