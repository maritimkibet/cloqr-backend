const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const { authenticate } = require('../middleware/auth');

router.get('/queue', authenticate, matchController.getMatchQueue);
router.post('/swipe', authenticate, matchController.swipe);
router.get('/matches', authenticate, matchController.getMatches);
router.get('/study-partners', authenticate, matchController.getStudyPartners);

module.exports = router;
