const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#99aab5'
  },
  permissions: [{
    type: String,
    enum: ['admin', 'manage_channels', 'manage_roles', 'kick_members', 'ban_members', 'send_messages', 'manage_messages', 'connect_voice', 'speak']
  }],
  position: {
    type: Number,
    default: 0
  }
});

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  joinedAt: {
    type: Date,
    default: Date.now
  },
  nickname: {
    type: String,
    default: null
  }
});

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  icon: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  description: {
    type: String,
    maxlength: 1024,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema],
  roles: [roleSchema],
  channels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  invites: [{
    code: String,
    uses: {
      type: Number,
      default: 0
    },
    maxUses: {
      type: Number,
      default: 0
    },
    expiresAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  defaultRole: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Server', serverSchema);

