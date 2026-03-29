const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    maxlength: 4000,
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    default: null
  },
  attachments: [{
    filename: String,
    url: String,
    type: String,
    size: Number
  }],
  embeds: [{
    title: String,
    description: String,
    url: String,
    color: String,
    image: String,
    thumbnail: String,
    footer: String,
    timestamp: Date
  }],
  mentions: {
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    roles: [{
      type: mongoose.Schema.Types.ObjectId
    }],
    everyone: {
      type: Boolean,
      default: false
    }
  },
  reactions: [{
    emoji: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emoji'
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    count: {
      type: Number,
      default: 1
    }
  }],
  editedAt: {
    type: Date,
    default: null
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  pinned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);

