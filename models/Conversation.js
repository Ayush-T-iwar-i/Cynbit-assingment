const mongoose = require('mongoose');
module.exports = mongoose.model('Conversation', new mongoose.Schema({
  sessionId: { type: String, index: true },
  messages: [{ role: String, content: String, _id: false }]
}, { timestamps: true }));