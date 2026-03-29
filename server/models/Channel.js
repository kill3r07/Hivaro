const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['text', 'voice', 'category'],
    default: 'text'
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    default: null
  },
  position: {
    type: Number,
    default: 0
  },
  topic: {
    type: String,
    maxlength: 1024,
    default: ''
  },
  nsfw: {
    type: Boolean,
    default: false
  },
  slowmode: {
    type: Number,
    default: 0
  },
  permissionOverwrites: [{
    role: {
      type: mongoose.Schema.Types.ObjectId
    },
    allow: [String],
    deny: [String]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Channel', channelSchema);
