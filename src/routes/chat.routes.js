const express = require('express');
const router = express.Router();
const multer = require('multer');
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

router.get('/', authenticate, chatController.getChats);
router.post('/create', authenticate, chatController.createChat);
router.get('/:chatId/messages', authenticate, chatController.getMessages);
router.post('/:chatId/message', authenticate, chatController.sendMessage);
router.post('/:chatId/photo', authenticate, upload.single('photo'), chatController.sendPhoto);
router.post('/:chatId/screenshot', authenticate, chatController.reportScreenshot);

module.exports = router;
