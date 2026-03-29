const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'avatar' ? 'avatars' : 'banners';
    cb(null, path.join(__dirname, '../../uploads', folder));
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'username tag avatar status customStatus badges')
      .populate('servers', 'name icon');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/settings', auth, async (req, res) => {
  try {
    const { theme, language, notifications, soundEffects } = req.body;
    const user = await User.findById(req.user._id);
    
    if (theme) user.settings.theme = theme;
    if (language) user.settings.language = language;
    if (notifications !== undefined) user.settings.notifications = notifications;
    if (soundEffects !== undefined) user.settings.soundEffects = soundEffects;
    
    await user.save();
    res.json(user.settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/profile', auth, async (req, res) => {
  try {
    const { customStatus } = req.body;
    const user = await User.findById(req.user._id);
    
    if (customStatus !== undefined) user.customStatus = customStatus;
    
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const user = await User.findById(req.user._id);
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    
    res.json({ avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/banner', auth, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const user = await User.findById(req.user._id);
    user.banner = `/uploads/banners/${req.file.filename}`;
    await user.save();
    
    res.json({ banner: user.banner });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both passwords are required' });
    }
    
    if (newPassword.length < 8 || newPassword.length > 20) {
      return res.status(400).json({ message: 'New password must be between 8 and 20 characters' });
    }
    
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -friendRequests')
      .populate('friends', 'username tag avatar status badges');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { tag: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username tag avatar status badges')
    .limit(20);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/friend-request/:id', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (targetUser._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({ message: 'Cannot add yourself' });
    }
    
    if (currentUser.friends.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }
    
    if (currentUser.friendRequests.sent.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Request already sent' });
    }
    
    currentUser.friendRequests.sent.push(targetUser._id);
    await currentUser.save();
    
    targetUser.friendRequests.received.push(currentUser._id);
    await targetUser.save();
    
    res.json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/accept-friend/:id', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!currentUser.friendRequests.received.includes(targetUser._id)) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }
    
    currentUser.friendRequests.received = currentUser.friendRequests.received.filter(
      id => id.toString() !== targetUser._id.toString()
    );
    targetUser.friendRequests.sent = targetUser.friendRequests.sent.filter(
      id => id.toString() !== currentUser._id.toString()
    );
    
    currentUser.friends.push(targetUser._id);
    targetUser.friends.push(currentUser._id);
    
    await currentUser.save();
    await targetUser.save();
    
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reject-friend/:id', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    currentUser.friendRequests.received = currentUser.friendRequests.received.filter(
      id => id.toString() !== targetUser._id.toString()
    );
    targetUser.friendRequests.sent = targetUser.friendRequests.sent.filter(
      id => id.toString() !== currentUser._id.toString()
    );
    
    await currentUser.save();
    await targetUser.save();
    
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
