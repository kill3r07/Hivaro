const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.post('/', auth, async (req, res) => {
  try {
    const { name, icon } = req.body;
    
    const server = new Server({
      name,
      icon: icon || null,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        roles: [],
        nickname: null
      }]
    });
    
    const everyoneRole = {
      name: '@everyone',
      color: '#99aab5',
      permissions: ['send_messages', 'connect_voice', 'speak'],
      position: 0
    };
    
    server.roles.push(everyoneRole);
    
    const generalChannel = new Channel({
      name: 'general',
      type: 'text',
      server: server._id,
      topic: 'General discussion'
    });
    
    const voiceChannel = new Channel({
      name: 'General Voice',
      type: 'voice',
      server: server._id
    });
    
    await generalChannel.save();
    await voiceChannel.save();
    
    server.channels.push(generalChannel._id, voiceChannel._id);
    await server.save();
    
    await User.findByIdAndUpdate(req.user._id, {
      $push: { servers: server._id }
    });
    
    res.status(201).json(server);
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'servers',
      populate: {
        path: 'channels',
        select: 'name type'
      }
    });
    
    res.json(user.servers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id)
      .populate('owner', 'username tag avatar')
      .populate({
        path: 'members.user',
        select: 'username tag avatar status customStatus badges'
      })
      .populate('channels')
      .populate('roles');
    
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    
    const isMember = server.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this server' });
    }
    
    res.json(server);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/invites', auth, async (req, res) => {
  try {
    const { maxUses = 0, expiresIn = 86400 } = req.body;
    
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    
    const member = server.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member) {
      return res.status(403).json({ message: 'Not a member' });
    }
    
    const invite = {
      code: uuidv4().split('-')[0],
      maxUses: parseInt(maxUses),
      expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
      createdBy: req.user._id
    };
    
    server.invites.push(invite);
    await server.save();
    
    res.json({ code: invite.code, url: `${req.protocol}://${req.get('host')}/invite/${invite.code}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/join/:code', auth, async (req, res) => {
  try {
    const server = await Server.findOne({ 'invites.code': req.params.code });
    
    if (!server) {
      return res.status(404).json({ message: 'Invalid invite' });
    }
    
    const invite = server.invites.find(i => i.code === req.params.code);
    
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invite expired' });
    }
    
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      return res.status(400).json({ message: 'Invite max uses reached' });
    }
    
    const isMember = server.members.some(m => m.user.toString() === req.user._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'Already a member' });
    }
    
    server.members.push({
      user: req.user._id,
      roles: [],
      joinedAt: new Date()
    });
    
    invite.uses += 1;
    await server.save();
    
    await User.findByIdAndUpdate(req.user._id, {
      $push: { servers: server._id }
    });
    
    res.json({ message: 'Joined server successfully', server });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/channels', auth, async (req, res) => {
  try {
    const { name, type = 'text', parent = null } = req.body;
    
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    
    const isOwner = server.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: 'No permission' });
    }
    
    const channel = new Channel({
      name,
      type,
      server: server._id,
      parent
    });
    
    await channel.save();
    server.channels.push(channel._id);
    await server.save();
    
    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/roles', auth, async (req, res) => {
  try {
    const { name, color, permissions = [] } = req.body;
    
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    
    if (server.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can create roles' });
    }
    
    const role = {
      name,
      color: color || '#99aab5',
      permissions,
      position: server.roles.length
    };
    
    server.roles.push(role);
    await server.save();
    
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/members/:userId/roles', auth, async (req, res) => {
  try {
    const { roleId } = req.body;
    
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    
    if (server.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can assign roles' });
    }
    
    const member = server.members.find(m => m.user.toString() === req.params.userId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    
    if (!member.roles.includes(roleId)) {
      member.roles.push(roleId);
      await server.save();
    }
    
    res.json({ message: 'Role assigned' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/leave', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    
    if (server.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Owner cannot leave. Transfer ownership or delete server.' });
    }
    
    server.members = server.members.filter(m => m.user.toString() !== req.user._id.toString());
    await server.save();
    
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { servers: server._id }
    });
    
    res.json({ message: 'Left server' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
