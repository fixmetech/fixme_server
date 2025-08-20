const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

router.post('/:chatId/message', chatController.sendMessage);
router.get('/:chatId/messages', chatController.getMessages);

module.exports = router;
