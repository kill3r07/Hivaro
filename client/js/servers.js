// Server management functions

const Servers = {
  currentServer: null,
  servers: [],

  async loadAll() {
    try {
      const response = await fetch(`${API_URL}/servers`, {
        headers: Auth.setAuthHeader()
      });
      
      if (!response.ok) throw new Error('Failed to load servers');
      
      this.servers = await response.json();
      this.renderServerList();
      return this.servers;
    } catch (error) {
      console.error('Load servers error:', error);
      return [];
    }
  },

  async loadOne(serverId) {
    try {
      const response = await fetch(`${API_URL}/servers/${serverId}`, {
        headers: Auth.setAuthHeader()
      });
      
      if (!response.ok) throw new Error('Failed to load server');
      
      this.currentServer = await response.json();
      this.renderChannels();
      this.renderMembers();
      return this.currentServer;
    } catch (error) {
      console.error('Load server error:', error);
      return null;
    }
  },

  renderServerList() {
    const container = document.getElementById('user-servers');
    container.innerHTML = '';
    
    this.servers.forEach(server => {
      const el = this.createServerElement(server);
      container.appendChild(el);
    });
  },

  createServerElement(server) {
    const div = document.createElement('div');
    div.className = 'server-item';
    div.dataset.serverId = server._id;
    
    const iconUrl = server.icon || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(server.name)}&background=5865F2&color=fff`;
    
    div.innerHTML = `
      <div class="server-icon">
        <img src="${iconUrl}" alt="${server.name}">
      </div>
      <div class="server-tooltip">${server.name}</div>
    `;
    
    div.addEventListener('click', () => {
      document.querySelectorAll('.server-item').forEach(el => el.classList.remove('active'));
      div.classList.add('active');
      this.loadOne(server._id);
    });
    
    return div;
  },

  renderChannels() {
    if (!this.currentServer) return;
    
    document.getElementById('channel-header').innerHTML = `<h3>${this.currentServer.name}</h3>`;
    document.getElementById('community-header').style.display = 'block';
    
    const container = document.getElementById('community-channels');
    container.style.display = 'block';
    container.innerHTML = '';
    
    // Group by category if exists
    const categories = this.currentServer.channels.filter(c => c.type === 'category');
    const uncategorized = this.currentServer.channels.filter(c => !c.parent && c.type !== 'category');
    
    categories.forEach(category => {
      const categoryEl = document.createElement('div');
      categoryEl.className = 'channel-category';
      categoryEl.innerHTML = `<div class="category-name">${category.name}</div>`;
      
      const children = this.currentServer.channels.filter(c => c.parent === category._id);
      children.forEach(channel => {
        categoryEl.appendChild(this.createChannelElement(channel));
      });
      
      container.appendChild(categoryEl);
    });
    
    uncategorized.forEach(channel => {
      container.appendChild(this.createChannelElement(channel));
    });
  },

  createChannelElement(channel) {
    const div = document.createElement('div');
    div.className = 'channel-item';
    div.dataset.channelId = channel._id;
    
    const icon = channel.type === 'voice' ? '🔊' : '#';
    
    div.innerHTML = `
      <span class="channel-icon">${icon}</span>
      <span class="channel-name">${channel.name}</span>
    `;
    
    div.addEventListener('click', () => {
      document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
      div.classList.add('active');
      currentChannel = channel._id;
      Chat.loadMessages(channel._id);
      document.getElementById('current-channel-name').textContent = channel.name;
    });
    
    return div;
  },

  renderMembers() {
    if (!this.currentServer) return;
    
    const container = document.getElementById('members-list');
    container.innerHTML = '';
    
    // Sort by role/online status
    const sortedMembers = this.currentServer.members.sort((a, b) => {
      if (a.user.status === 'online' && b.user.status !== 'online') return -1;
      if (b.user.status === 'online' && a.user.status !== 'online') return 1;
      return 0;
    });
    
    sortedMembers.forEach(member => {
      const el = this.createMemberElement(member);
      container.appendChild(el);
    });
  },

  createMemberElement(member) {
    const div = document.createElement('div');
    div.className = 'member-item';
    
    const user = member.user;
    const status = user.status || 'offline';
    
    div.innerHTML = `
      <div class="member-avatar-wrapper">
        <img src="${user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="" class="member-avatar">
        <div class="status-indicator ${status}"></div>
      </div>
      <div class="member-info">
        <div class="member-name">${user.nickname || user.username}</div>
        <div class="member-status">${user.customStatus || status}</div>
      </div>
    `;
    
    return div;
  },

  async create(name, icon = null) {
    try {
      const response = await fetch(`${API_URL}/servers`, {
        method: 'POST',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, icon })
      });
      
      if (!response.ok) throw new Error('Failed to create server');
      
      const server = await response.json();
      this.servers.push(server);
      this.renderServerList();
      return server;
    } catch (error) {
      console.error('Create server error:', error);
      throw error;
    }
  },

  async createChannel(serverId, name, type = 'text') {
    try {
      const response = await fetch(`${API_URL}/servers/${serverId}/channels`, {
        method: 'POST',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, type })
      });
      
      if (!response.ok) throw new Error('Failed to create channel');
      
      const channel = await response.json();
      this.currentServer.channels.push(channel);
      this.renderChannels();
      return channel;
    } catch (error) {
      console.error('Create channel error:', error);
      throw error;
    }
  },

  async createInvite(serverId, maxUses = 0, expiresIn = 86400) {
    try {
      const response = await fetch(`${API_URL}/servers/${serverId}/invites`, {
        method: 'POST',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maxUses, expiresIn })
      });
      
      if (!response.ok) throw new Error('Failed to create invite');
      
      return await response.json();
    } catch (error) {
      console.error('Create invite error:', error);
      throw error;
    }
  },

  async join(inviteCode) {
    try {
      const response = await fetch(`${API_URL}/servers/join/${inviteCode}`, {
        method: 'POST',
        headers: Auth.setAuthHeader()
      });
      
      if (!response.ok) throw new Error('Failed to join server');
      
      const result = await response.json();
      this.servers.push(result.server);
      this.renderServerList();
      return result;
    } catch (error) {
      console.error('Join server error:', error);
      throw error;
    }
  },

  async leave(serverId) {
    try {
      const response = await fetch(`${API_URL}/servers/${serverId}/leave`, {
        method: 'POST',
        headers: Auth.setAuthHeader()
      });
      
      if (!response.ok) throw new Error('Failed to leave server');
      
      this.servers = this.servers.filter(s => s._id !== serverId);
      this.renderServerList();
      return true;
    } catch (error) {
      console.error('Leave server error:', error);
      throw error;
    }
  },

  getCurrent() {
    return this.currentServer;
  },

  getAll() {
    return this.servers;
  }
};
      
