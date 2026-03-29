const mongoose = require('mongoose');

const emojiSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 32
  },
  url: {
    type: String,
    required: true
  },
  animated: {
    type: Boolean,
    default: false
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    default: null
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  global: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Emoji', emojiSchema);
