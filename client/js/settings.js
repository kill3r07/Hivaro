// Settings management

const Settings = {
  currentSection: 'profile',

  init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    // Theme options
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const theme = e.currentTarget.dataset.theme;
        this.changeTheme(theme);
      });
    });

    // Language options
    document.querySelectorAll('.language-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = e.currentTarget.dataset.lang;
        this.changeLanguage(lang);
      });
    });

    // Avatar upload
    const avatarUpload = document.getElementById('avatar-upload');
    const changeAvatarBtn = document.querySelector('.change-avatar-btn');
    
    if (changeAvatarBtn) {
      changeAvatarBtn.addEventListener('click', () => avatarUpload.click());
    }
    
    if (avatarUpload) {
      avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
    }

    // Password change
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => this.changePassword());
    }

    // Custom status
    const customStatusInput = document.getElementById('custom-status');
    if (customStatusInput) {
      customStatusInput.addEventListener('blur', (e) => {
        this.updateCustomStatus(e.target.value);
      });
    }

    // Admin buttons
    const viewUsersBtn = document.getElementById('view-users-btn');
    if (viewUsersBtn) {
      viewUsersBtn.addEventListener('click', () => this.viewAllUsers());
    }

    const uploadEmojiBtn = document.getElementById('upload-emoji-btn');
    if (uploadEmojiBtn) {
      uploadEmojiBtn.addEventListener('click', () => this.uploadEmoji());
    }

    const broadcastBtn = document.getElementById('broadcast-btn');
    if (broadcastBtn) {
      broadcastBtn.addEventListener('click', () => this.sendBroadcast());
    }
  },

  async changeTheme(theme) {
    // Update UI
    document.body.className = `theme-${theme}`;
    
    document.querySelectorAll('.theme-option').forEach(el => {
      el.classList.remove('selected');
      if (el.dataset.theme === theme) {
        el.classList.add('selected');
      }
    });

    // Save to server
    try {
      const response = await fetch(`${API_URL}/users/settings`, {
        method: 'PATCH',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme })
      });

      if (response.ok && currentUser) {
        currentUser.settings.theme = theme;
      }
    } catch (error) {
      console.error('Change theme error:', error);
    }
  },

  async changeLanguage(lang) {
    currentLanguage = lang;
    
    // Update UI
    document.querySelectorAll('.language-btn').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.lang === lang) {
        el.classList.add('active');
      }
    });

    updateLanguage();

    // Save to server
    try {
      const response = await fetch(`${API_URL}/users/settings`, {
        method: 'PATCH',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language: lang })
      });

      if (response.ok && currentUser) {
        currentUser.settings.language = lang;
      }
    } catch (error) {
      console.error('Change language error:', error);
    }
  },

  async handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(`${API_URL}/users/avatar`, {
        method: 'POST',
        headers: Auth.setAuthHeader(),
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        document.getElementById('avatar-preview').src = data.avatar;
        document.getElementById('user-avatar').src = data.avatar;
        if (currentUser) currentUser.avatar = data.avatar;
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload avatar');
    }
  },

  async updateCustomStatus(status) {
    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customStatus: status })
      });

      if (response.ok && currentUser) {
        currentUser.customStatus = status;
      }
    } catch (error) {
      console.error('Update status error:', error);
    }
  },

  async changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;

    if (!currentPassword || !newPassword) {
      alert('Please fill in both password fields');
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 20) {
      alert('New password must be between 8 and 20 characters');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/password`, {
        method: 'PATCH',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (response.ok) {
        alert('Password changed successfully');
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      alert('Connection error');
    }
  },

  // Admin functions
  async viewAllUsers() {
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: Auth.setAuthHeader()
      });

      if (!response.ok) throw new Error('Failed to load users');

      const users = await response.json();
      console.log('All users:', users);
      
      // Create a modal or table to display users
      this.renderUsersList(users);
    } catch (error) {
      console.error('View users error:', error);
      alert('Failed to load users');
    }
  },

  renderUsersList(users) {
    // Simple alert with user count for now
    alert(`Total users: ${users.length}\n\nFirst 5:\n${users.slice(0, 5).map(u => `- ${u.username} (${u.tag})`).join('\n')}`);
  },

  async uploadEmoji() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const name = prompt('Enter emoji name (without colons):');
      if (!name) return;

      const formData = new FormData();
      formData.append('emoji', file);
      formData.append('name', name);

      try {
        const response = await fetch(`${API_URL}/admin/emojis`, {
          method: 'POST',
          headers: Auth.setAuthHeader(),
          body: formData
        });

        if (response.ok) {
          alert('Emoji uploaded successfully!');
        } else {
          alert('Failed to upload emoji');
        }
      } catch (error) {
        console.error('Upload emoji error:', error);
        alert('Connection error');
      }
    };
    
    input.click();
  },

  async sendBroadcast() {
    const content = prompt('Enter broadcast message:');
    if (!content) return;

    try {
      const response = await fetch(`${API_URL}/admin/broadcast`, {
        method: 'POST',
        headers: {
          ...Auth.setAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, type: 'info' })
      });

      if (response.ok) {
        alert('Broadcast sent!');
      } else {
        alert('Failed to send broadcast');
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      alert('Connection error');
    }
  },

  open() {
    document.getElementById('settings-modal').classList.remove('hidden');
    this.loadCurrentSettings();
  },

  close() {
    document.getElementById('settings-modal').classList.add('hidden');
  },

  loadCurrentSettings() {
    if (!currentUser) return;

    // Load profile info
    document.getElementById('display-name').value = currentUser.username || '';
    document.getElementById('custom-status').value = currentUser.customStatus || '';
    document.getElementById('avatar-preview').src = currentUser.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';

    // Select current theme
    document.querySelectorAll('.theme-option').forEach(el => {
      el.classList.remove('selected');
      if (el.dataset.theme === currentUser.settings?.theme) {
        el.classList.add('selected');
      }
    });

    // Select current language
    document.querySelectorAll('.language-btn').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.lang === currentUser.settings?.language) {
        el.classList.add('active');
      }
    });

    // Load admin stats if owner
    if (currentUser.isOwner) {
      this.loadAdminStats();
    }
  },

  async loadAdminStats() {
    try {
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: Auth.setAuthHeader()
      });

      if (!response.ok) return;

      const stats = await response.json();
      const container = document.getElementById('admin-stats');
      
      if (container) {
        container.innerHTML = `
          <div class="stat-card">
            <div class="stat-value">${stats.totalUsers}</div>
            <div class="stat-label">Total Users</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalServers}</div>
            <div class="stat-label">Total Servers</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.onlineUsers}</div>
            <div class="stat-label">Online Now</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.newUsersToday}</div>
            <div class="stat-label">New Today</div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Load admin stats error:', error);
    }
  },

  switchSection(section) {
    document.querySelectorAll('.settings-nav-item').forEach(el => {
      el.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    document.querySelectorAll('.settings-section').forEach(el => {
      el.classList.add('hidden');
    });
    document.getElementById(`section-${section}`)?.classList.remove('hidden');

    document.getElementById('settings-title').textContent = 
      section.charAt(0).toUpperCase() + section.slice(1);
    
    this.currentSection = section;
  }
};

// Initialize settings
Settings.init();
        
