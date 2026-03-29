const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Server = require('../models/Server');
const Emoji = require('../models/Emoji');
const { auth } = require('../middleware/auth');

router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;
    
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    if (channel.server) {
      const server = await Server.findById(channel.server);
      const isMember = server.members.some(m => m.user.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member' });
      }
    }
    
    let query = { channel: req.params.channelId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .populate('author', 'username tag avatar badges')
      .populate('reactions.emoji')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/channel/:channelId', auth, async (req, res) => {
  try {
    const { content, attachments = [], replyTo = null } = req.body;
    
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    if (channel.server) {
      const server = await Server.findById(channel.server);
      const isMember = server.members.some(m => m.user.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member' });
      }
    }
    
    const mentionRegex = /@([^\s]+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedUser = await User.findOne({ username: match[1] });
      if (mentionedUser) {
        mentions.push(mentionedUser._id);
      }
    }
    
    const message = new Message({
      content,
      author: req.user._id,
      channel: channel._id,
      server: channel.server,
      attachments,
      mentions: {
        users: mentions,
        everyone: content.includes('@everyone')
      },
      replyTo
    });
    
    await message.save();
    await message.populate('author', 'username tag avatar badges');
    
    const io = req.app.get('io');
    io.to(`channel-${channel._id}`).emit('new-message', message);
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:messageId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    message.content = content;
    message.editedAt = new Date();
    await message.save();
    await message.populate('author', 'username tag avatar badges');
    
    const io = req.app.get('io');
    io.to(`channel-${message.channel}`).emit('message-updated', message);
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    const canDelete = message.author.toString() === req.user._id.toString() || req.user.isOwner;
    
    if (!canDelete) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await Message.findByIdAndDelete(req.params.messageId);
    
    const io = req.app.get('io');
    io.to(`channel-${message.channel}`).emit('message-deleted', { messageId: req.params.messageId });
    
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:messageId/reactions', auth, async (req, res) => {
  try {
    const { emojiId } = req.body;
    
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    const existingReaction = message.reactions.find(r => r.emoji.toString() === emojiId);
    
    if (existingReaction) {
      if (!existingReaction.users.includes(req.user._id)) {
        existingReaction.users.push(req.user._id);
        existingReaction.count += 1;
      }
    } else {
      message.reactions.push({
        emoji: emojiId,
        users: [req.user._id],
        count: 1
      });
    }
    
    await message.save();
    
    const io = req.app.get('io');
    io.to(`channel-${message.channel}`).emit('reaction-added', {
      messageId: message._id,
      reactions: message.reactions
    });
    
    res.json(message.reactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:messageId/pin', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (!req.user.isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    message.pinned = !message.pinned;
    await message.save();
    
    res.json({ pinned: message.pinned });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
