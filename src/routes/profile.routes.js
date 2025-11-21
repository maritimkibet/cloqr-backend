const express = require('express');
const router = express.Router();
const multer = require('multer');
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

router.get('/', authenticate, profileController.getProfile);
router.put('/', authenticate, profileController.updateProfile);
router.post('/avatar', authenticate, profileController.selectAvatar);
router.post('/photo', authenticate, upload.single('photo'), profileController.uploadPhoto);
router.post('/report', authenticate, profileController.reportUser);
router.post('/block', authenticate, profileController.blockUser);

module.exports = router;
