const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/experimentController');

router.post('/start-session',        ctrl.startSession);
router.get('/images',                ctrl.getImages);
router.post('/submit-response',      ctrl.submitResponse);
router.post('/complete-experiment',  ctrl.completeExperiment);
router.get('/cheatsheet',            ctrl.getCheatsheet);

module.exports = router;
