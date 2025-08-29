const { rtdb } = require('../firebase');

// Send message
exports.sendMessage = async (req, res) => {
  const { chatId } = req.params;
  const { senderId, text } = req.body;
  const messageRef = rtdb.ref(`messages/${chatId}`).push();
  const messageData = {
    senderId,
    text,
    timestamp: Date.now(),
  };
  await messageRef.set(messageData);
  res.status(200).json({ message: 'Message sent.' });
};

// Get messages
exports.getMessages = async (req, res) => {
  const { chatId } = req.params;
  const messagesRef = rtdb.ref(`messages/${chatId}`);
  messagesRef.once('value', (snapshot) => {
    res.status(200).json(snapshot.val());
  });
};
