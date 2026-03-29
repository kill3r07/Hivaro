const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    maxlength: 100
  },
  tag: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'idle', 'dnd'],
    default: 'offline'
  },
  customStatus: {
    type: String,
    maxlength: 100,
    default: ''
  },
  badges: [{
    type: String,
    enum: ['owner', 'admin', 'moderator', 'vip', 'early', 'developer', 'supporter', 'verified']
  }],
  isOwner: {
    type: Boolean,
    default: false
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: {
    sent: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    received: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  servers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server'
  }],
  settings: {
    theme: {
      type: String,
      enum: ['gradient-purple', 'gradient-blue', 'gradient-pink', 'dark', 'light'],
      default: 'gradient-purple'
    },
    language: {
      type: String,
      enum: ['en', 'pl'],
      default: 'en'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    soundEffects: {
      type: Boolean,
      default: true
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateTag = function() {
  if (this.username === 'kill3r') {
    this.tag = '#777';
  } else {
    const length = Math.floor(Math.random() * 3) + 4;
    let tag = '#';
    for (let i = 0; i < length; i++) {
      tag += Math.floor(Math.random() * 10);
    }
    this.tag = tag;
  }
};

module.exports = mongoose.model('User', userSchema);

