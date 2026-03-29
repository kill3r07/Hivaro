const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Server = require('../models/Server');
const Emoji = require('../models/Emoji');
const { auth, isOwner } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const emojiStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/emojis'));
  },
  filename: (req, file, cb) => {
    cb(null, `emoji-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadEmoji = multer({
  storage: emojiStorage,
  limits: { fileSize: 256 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

router.get('/stats', auth, isOwner, async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      totalServers: await Server.countDocuments(),
      totalEmojis: await Emoji.countDocuments(),
      onlineUsers: await User.countDocuments({ status: 'online' }),
      newUsersToday: await User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', auth, isOwner, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/users/:id/badges', auth, isOwner, async (req, res) => {
  try {
    const { badges } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { badges },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', auth, isOwner, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user.isOwner) {
      return res.status(400).json({ message: 'Cannot delete owner' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/emojis', auth, isOwner, uploadEmoji.single('emoji'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const existing = await Emoji.findOne({ name, global: true });
    if (existing) {
      return res.status(400).json({ message: 'Emoji name already exists' });
    }
    
    const emoji = new Emoji({
      name,
      url: `/uploads/emojis/${req.file.filename}`,
      uploader: req.user._id,
      global: true
    });
    
    await emoji.save();
    res.status(201).json(emoji);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/emojis/:id', auth, isOwner, async (req, res) => {
  try {
    await Emoji.findByIdAndDelete(req.params.id);
    res.json({ message: 'Emoji deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/broadcast', auth, isOwner, async (req, res) => {
  try {
    const { content, type = 'info' } = req.body;
    
    const io = req.app.get('io');
    io.emit('admin-broadcast', {
      content,
      type,
      timestamp: new Date()
    });
    
    res.json({ message: 'Broadcast sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/settings', auth, isOwner, async (req, res) => {
  try {
    const settings = {
      maintenance: process.env.MAINTENANCE_MODE === 'true',
      registrationOpen: process.env.REGISTRATION_OPEN !== 'false',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
      maxEmojisPerServer: parseInt(process.env.MAX_EMOJIS_PER_SERVER) || 50
    };
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/settings', auth, isOwner, async (req, res) => {
  try {
    const { maintenance, registrationOpen } = req.body;
    
    if (maintenance !== undefined) {
      process.env.MAINTENANCE_MODE = maintenance.toString();
    }
    if (registrationOpen !== undefined) {
      process.env.REGISTRATION_OPEN = registrationOpen.toString();
    }
    
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
