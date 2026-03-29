// Chat-specific functionality

const Chat = {
  messages: [],
  typingTimeout: null,

  async loadMessages(channelId) {
    try {
      const response = await fetch(`${API_URL}/messages/channel/${channelId}`, {
        headers: { 
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to load messages');
      
      this.messages = await response.json();
      this.renderMessages();
      return this.messages;
    } catch (error) {
      console.error('Load messages error:', error);
      return [];
    }
  },

  renderMessages() {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    
    this.messages.forEach(message => {
      this.appendMessage(message);
    });
    
    this.scrollToBottom();
  },

  appendMessage(message) {
    const container = document.getElementById('messages-container');
    const messageEl = this.createMessageElement(message);
    container.appendChild(messageEl);
    this.scrollToBottom();
  },

  createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message';
    div.dataset.messageId = message._id;
    
    const author = message.author;
    const badges = author.badges?.map(badge => {
      const badgeClass = badge === 'owner' ? 'owner' : badge === 'admin' ? 'admin' : 'moderator';
      return `<span class="message-badge ${badgeClass}">${badge}</span>`;
    }).join('') || '';
    
    const time = new Date(message.createdAt).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const edited = message.editedAt ? '<span class="edited">(edited)</span>' : '';
    
    div.innerHTML = `
      <img src="${author.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="" class="message-avatar">
      <div class="message-content">
        <div class="message-header">
          <span class="message-author" style="color: ${this.getUserColor(author)}">${author.username}</span>
          ${badges}
          <span class="message-time">${time}</span>
          ${edited}
        </div>
        <div class="message-text">${this.formatContent(message.content)}</div>
        ${this.renderReactions(message.reactions)}
      </div>
    `;
    
    return div;
  },

  formatContent(content) {
    if (!content) return '';
    // Format mentions
    content = content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    // Format URLs
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    // Format newlines
    content = content.replace(/\n/g, '<br>');
    return content;
  },

  renderReactions(reactions) {
    if (!reactions || reactions.length === 0) return '';
    
    const reactionsHtml = reactions.map(r => `
      <span class="reaction" data-emoji="${r.emoji}">
        ${r.emoji} ${r.count}
      </span>
    `).join('');
    
    return `<div class="message-reactions">${reactionsHtml}</div>`;
  },

  getUserColor(user) {
    // Generate consistent color from username
    const colors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#f1c40f', '#e67e22', '#e74c3c'];
    let hash = 0;
    for (let i = 0; i < user.username.length; i++) {
      hash = user.username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  async sendMessage(channelId, content) {
    if (!content.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/messages/channel/${channelId}`, {
        method: 'POST',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      return await response.json();
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },

  async editMessage(messageId, content) {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Edit message error:', error);
      return false;
    }
  },

  async deleteMessage(messageId) {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: Auth.setAuthHeader()
      });
      
      return response.ok;
    } catch (error) {
      console.error('Delete message error:', error);
      return false;
    }
  },

  async addReaction(messageId, emojiId) {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emojiId })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Add reaction error:', error);
      return false;
    }
  },

  showTyping() {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    
    socket.emit('typing', { 
      channelId: currentChannel, 
      username: currentUser.username,
      typing: true 
    });
    
    this.typingTimeout = setTimeout(() => {
      socket.emit('typing', { 
        channelId: currentChannel, 
        username: currentUser.username,
        typing: false 
      });
    }, 3000);
  },

  scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
  },

  clear() {
    this.messages = [];
    document.getElementById('messages-container').innerHTML = '';
  }
};
