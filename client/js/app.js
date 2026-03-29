// Hivaro Chat Application - Main App Logic - Part 1/4

const API_URL = window.location.origin + '/api';
let socket = null;
let currentUser = null;
let currentServer = 'home';
let currentChannel = null;
let currentLanguage = 'en';

const translations = {
  en: {
    welcome: 'Welcome to Hivaro!',
    welcomeSub: 'This is the beginning of your chat history.',
    login: 'Log In',
    register: 'Register',
    username: 'Username',
    password: 'Password',
    createAccount: 'Create Account',
    settings: 'Settings',
    profile: 'Profile',
    appearance: 'Appearance',
    language: 'Language',
    account: 'Account',
    logout: 'Log Out',
    friends: 'Friends',
    members: 'Members',
    typeMessage: 'Message',
    online: 'Online',
    offline: 'Offline',
    idle: 'Idle',
    dnd: 'Do Not Disturb',
    loading: 'Connecting to server...',
    adminPanel: 'Admin Panel'
  },
  pl: {
    welcome: 'Witaj w Hivaro!',
    welcomeSub: 'To początek Twojej historii czatu.',
    login: 'Zaloguj się',
    register: 'Zarejestruj się',
    username: 'Nazwa użytkownika',
    password: 'Hasło',
    createAccount: 'Utwórz konto',
    settings: 'Ustawienia',
    profile: 'Profil',
    appearance: 'Wygląd',
    language: 'Język',
    account: 'Konto',
    logout: 'Wyloguj się',
    friends: 'Znajomi',
    members: 'Członkowie',
    typeMessage: 'Wiadomość',
    online: 'Dostępny',
    offline: 'Niedostępny',
    idle: 'Zaraz wracam',
    dnd: 'Nie przeszkadzać',
    loading: 'Łączenie z serwerem...',
    adminPanel: 'Panel Administratora'
  }
};

const loadingTips = {
  en: [
    'Connecting to server...',
    'Loading your profile...',
    'Fetching friends list...',
    'Syncing servers...',
    'Preparing chat...',
    'Almost there...',
    'Welcome to Hivaro!'
  ],
  pl: [
    'Łączenie z serwerem...',
    'Ładowanie profilu...',
    'Pobieranie listy znajomych...',
    'Synchronizacja serwerów...',
    'Przygotowywanie czatu...',
    'Już prawie...',
    'Witaj w Hivaro!'
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupEventListeners();
  setupSocket();
});

async function checkAuth() {
  const token = localStorage.getItem('hivaro_token');
  
  if (!token) {
    showAuthScreen();
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      showLoadingScreen();
      setTimeout(() => {
        showApp();
        initializeUser();
      }, 3000);
    } else {
      localStorage.removeItem('hivaro_token');
      showAuthScreen();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showAuthScreen();
  }
}

function showLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  const tipsElement = document.getElementById('loading-tips');
  
  loadingScreen.classList.remove('hidden');
  document.getElementById('auth-screen').classList.add('hidden');
  
  let tipIndex = 0;
  const tips = loadingTips[currentLanguage] || loadingTips.en;
  
  const tipInterval = setInterval(() => {
    if (tipIndex < tips.length) {
      tipsElement.textContent = tips[tipIndex];
      tipIndex++;
    }
  }, 1400);
  
  setTimeout(() => {
    clearInterval(tipInterval);
  }, 10000);
}

function showAuthScreen() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

// Hivaro Chat Application - Part 2/4

function initializeUser() {
  document.getElementById('user-name').textContent = currentUser.username;
  document.getElementById('user-tag').textContent = currentUser.tag;
  document.getElementById('user-avatar').src = currentUser.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
  
  const statusIndicator = document.getElementById('user-status');
  statusIndicator.className = `status-indicator ${currentUser.status || 'online'}`;
  
  if (currentUser.settings?.theme) {
    document.body.className = `theme-${currentUser.settings.theme}`;
  }
  
  if (currentUser.settings?.language) {
    currentLanguage = currentUser.settings.language;
    updateLanguage();
  }
  
  if (currentUser.isOwner) {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.classList.remove('hidden');
      el.classList.add('visible');
    });
  }
  
  loadFriends();
  loadServers();
  
  if (socket) {
    socket.emit('join', currentUser.id);
  }
}

function setupSocket() {
  socket = io(window.location.origin);
  
  socket.on('connect', () => {
    console.log('Connected to socket server');
    if (currentUser) {
      socket.emit('join', currentUser.id);
    }
  });
  
  socket.on('new-message', (message) => {
    if (currentChannel && message.channel === currentChannel) {
      displayMessage(message);
    }
  });
  
  socket.on('user-typing', (data) => {
    showTypingIndicator(data);
  });
  
  socket.on('admin-broadcast', (data) => {
    showNotification(data.content, data.type);
  });
}

function setupEventListeners() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const formId = tab.dataset.tab === 'login' ? 'login-form' : 'register-form';
      document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
      document.getElementById(formId).classList.remove('hidden');
    });
  });
  
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('close-settings').addEventListener('click', closeSettings);
  
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      switchSettingsSection(section);
    });
  });
  
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      changeTheme(theme);
    });
  });
  
  document.querySelectorAll('.language-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      changeLanguage(lang);
    });
  });
  
  document.getElementById('logout-btn').addEventListener('click', logout);
  
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('add-server-btn').addEventListener('click', openCreateServerModal);
  document.getElementById('cancel-server').addEventListener('click', closeCreateServerModal);
  document.getElementById('create-server-btn').addEventListener('click', createServer);
  
  document.querySelector('.home-server').addEventListener('click', () => {
    loadHomeView();
  });
  
  document.getElementById('emoji-btn').addEventListener('click', toggleEmojiPicker);
  
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
}

// Hivaro Chat Application - Part 3/4

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('hivaro_token', data.token);
      currentUser = data.user;
      showLoadingScreen();
      setTimeout(() => {
        showApp();
        initializeUser();
      }, 3000);
    } else {
      document.getElementById('login-error').textContent = data.message || 'Login failed';
    }
  } catch (error) {
    document.getElementById('login-error').textContent = 'Connection error';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  
  if (password.length < 8 || password.length > 20) {
    document.getElementById('register-error').textContent = 'Password must be 8-20 characters';
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('hivaro_token', data.token);
      currentUser = data.user;
      showLoadingScreen();
      setTimeout(() => {
        showApp();
        initializeUser();
      }, 3000);
    } else {
      document.getElementById('register-error').textContent = data.message || 'Registration failed';
    }
  } catch (error) {
    document.getElementById('register-error').textContent = 'Connection error';
  }
}

async function loadFriends() {
  try {
    const token = localStorage.getItem('hivaro_token');
    const response = await fetch(`${API_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const user = await response.json();
      const friendsList = document.getElementById('friends-list');
      friendsList.innerHTML = '';
      
      user.friends.forEach(friend => {
        const friendEl = createFriendElement(friend);
        friendsList.appendChild(friendEl);
      });
    }
  } catch (error) {
    console.error('Load friends error:', error);
  }
}

function createFriendElement(friend) {
  const div = document.createElement('div');
  div.className = 'channel-item';
  div.innerHTML = `
    <img src="${friend.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="" class="channel-icon" style="width: 24px; height: 24px; border-radius: 50%;">
    <span class="channel-name">${friend.username}</span>
  `;
  div.addEventListener('click', () => openDM(friend));
  return div;
}

async function loadServers() {
  try {
    const token = localStorage.getItem('hivaro_token');
    const response = await fetch(`${API_URL}/servers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const servers = await response.json();
      const container = document.getElementById('user-servers');
      container.innerHTML = '';
      
      servers.forEach(server => {
        const serverEl = createServerElement(server);
        container.appendChild(serverEl);
      });
    }
  } catch (error) {
    console.error('Load servers error:', error);
  }
}

function createServerElement(server) {
  const div = document.createElement('div');
  div.className = 'server-item';
  div.dataset.server = server._id;
  
  const iconUrl = server.icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(server.name)}&background=5865F2&color=fff`;
  
  div.innerHTML = `
    <div class="server-icon">
      <img src="${iconUrl}" alt="${server.name}" style="width: 100%; height: 100%; border-radius: inherit; object-fit: cover;">
    </div>
    <div class="server-tooltip">${server.name}</div>
  `;
  
  div.addEventListener('click', () => loadServer(server._id));
  return div;
}

// Hivaro Chat Application - Part 4/4

async function loadServer(serverId) {
  currentServer = serverId;
  
  try {
    const token = localStorage.getItem('hivaro_token');
    const response = await fetch(`${API_URL}/servers/${serverId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const server = await response.json();
      
      document.getElementById('channel-header').innerHTML = `<h3>${server.name}</h3>`;
      
      document.getElementById('community-header').style.display = 'block';
      const channelsContainer = document.getElementById('community-channels');
      channelsContainer.style.display = 'block';
      channelsContainer.innerHTML = '';
      
      server.channels.forEach(channel => {
        const channelEl = createChannelElement(channel);
        channelsContainer.appendChild(channelEl);
      });
      
      loadMembers(server);
      
      if (server.channels.length > 0) {
        loadChannel(server.channels[0]._id);
      }
    }
  } catch (error) {
    console.error('Load server error:', error);
  }
}

function createChannelElement(channel) {
  const div = document.createElement('div');
  div.className = 'channel-item';
  div.dataset.channel = channel._id;
  
  const icon = channel.type === 'voice' ? '🔊' : '#';
  
  div.innerHTML = `
    <span class="channel-icon">${icon}</span>
    <span class="channel-name">${channel.name}</span>
  `;
  
  div.addEventListener('click', () => loadChannel(channel._id));
  return div;
}

async function loadChannel(channelId) {
  currentChannel = channelId;
  
  document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-channel="${channelId}"]`)?.classList.add('active');
  
  if (socket) {
    socket.emit('join-channel', channelId);
  }
  
  try {
    const token = localStorage.getItem('hivaro_token');
    const response = await fetch(`${API_URL}/messages/channel/${channelId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const messages = await response.json();
      const container = document.getElementById('messages-container');
      container.innerHTML = '';
      
      messages.forEach(message => {
        displayMessage(message);
      });
      
      container.scrollTop = container.scrollHeight;
    }
  } catch (error) {
    console.error('Load messages error:', error);
  }
}

function displayMessage(message) {
  const container = document.getElementById('messages-container');
  
  const messageEl = document.createElement('div');
  messageEl.className = 'message';
  
  const author = message.author;
  const badges = author.badges?.map(badge => {
    const badgeClass = badge === 'owner' ? 'owner' : badge === 'admin' ? 'admin' : 'moderator';
    return `<span class="message-badge ${badgeClass}">${badge}</span>`;
  }).join('') || '';
  
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageEl.innerHTML = `
    <img src="${author.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="" class="message-avatar">
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">${author.username}</span>
        ${badges}
        <span class="message-time">${time}</span>
      </div>
      <div class="message-text">${formatMessageContent(message.content)}</div>
    </div>
  `;
  
  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
}

function formatMessageContent(content) {
  if (!content) return '';
  return content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  
  if (!content || !currentChannel) return;
  
  try {
    const token = localStorage.getItem('hivaro_token');
    const response = await fetch(`${API_URL}/messages/channel/${currentChannel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    
    if (response.ok) {
      input.value = '';
    }
  } catch (error) {
    console.error('Send message error:', error);
  }
}

function loadMembers(server) {
  const container = document.getElementById('members-list');
  container.innerHTML = '';
  
  server.members.forEach(member => {
    const memberEl = document.createElement('div');
    memberEl.className = 'member-item';
    
    const user = member.user;
    const status = user.status || 'offline';
    
    memberEl.innerHTML = `
      <div style="position: relative;">
        <img src="${user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="" class="member-avatar">
        <div class="status-indicator ${status}" style="position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px;"></div>
      </div>
      <div class="member-info">
        <div class="member-name">${user.username}</div>
        <div class="member-status">${user.customStatus || translations[currentLanguage][status] || status}</div>
      </div>
    `;
    
    container.appendChild(memberEl);
  });
}

function openDM(friend) {
  currentChannel = 'dm-' + friend._id;
  document.getElementById('current-channel-name').textContent = friend.username;
  
  const container = document.getElementById('messages-container');
  container.innerHTML = `
    <div class="welcome-message">
      <h2>${translations[currentLanguage].welcome}</h2>
      <p>This is the beginning of your direct message history with @${friend.username}</p>
    </div>
  `;
}

function loadHomeView() {
  currentServer = 'home';
  document.getElementById('channel-header').innerHTML = `<h3>${translations[currentLanguage].friends}</h3>`;
  document.getElementById('current-channel-name').textContent = 'general';
  document.getElementById('community-header').style.display = 'none';
  document.getElementById('community-channels').style.display = 'none';
  
  const container = document.getElementById('messages-container');
  container.innerHTML = `
    <div class="welcome-message">
      <h2>${translations[currentLanguage].welcome}</h2>
      <p>${translations[currentLanguage].welcomeSub}</p>
    </div>
  `;
}

function openSettings() {
  document.getElementById('settings-modal').classList.remove('hidden');
  
  document.getElementById('display-name').value = currentUser.username || '';
  document.getElementById('custom-status').value = currentUser.customStatus || '';
  document.getElementById('avatar-preview').src = currentUser.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
  
  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.remove('selected');
    if (el.dataset.theme === currentUser.settings?.theme) {
      el.classList.add('selected');
    }
  });
  
  document.querySelectorAll('.language-btn').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.lang === currentLanguage) {
      el.classList.add('active');
    }
  });
  
  if (currentUser.isOwner) {
    loadAdminStats();
  }
}

function closeSettings() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function switchSettingsSection(section) {
  document.querySelectorAll('.settings-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-section="${section}"]`).classList.add('active');
  
  document.querySelectorAll('.settings-section').forEach(el => el.classList.add('hidden'));
  document.getElementById(`section-${section}`).classList.remove('hidden');
  
  document.getElementById('settings-title').textContent = 
    section.charAt(0).toUpperCase() + section.slice(1);
}

async function changeTheme(theme) {
  document.body.className = `theme-${theme}`;
  
  document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
  document.querySelector(`[data-theme="${theme}"]`).classList.add('selected');
  
  try {
    const token = localStorage.getItem('hivaro_token');
    await fetch(`${API_URL}/users/settings`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ theme })
    });
  } catch (error) {
    console.error('Change theme error:', error);
  }
}

async function changeLanguage(lang) {
  currentLanguage = lang;
  updateLanguage();
  
  document.querySelectorAll('.language-btn').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-lang="${lang}"]`).classList.add('active');
  
  try {
    const token = localStorage.getItem('hivaro_token');
    await fetch(`${API_URL}/users/settings`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ language: lang })
    });
  } catch (error) {
    console.error('Change language error:', error);
  }
}

function updateLanguage() {
  const t = translations[currentLanguage];
  
  document.querySelector('.home-server .server-tooltip').textContent = 'Home';
  document.getElementById('community-header').textContent = t.friends;
  document.querySelector('.members-header').textContent = t.members;
  document.getElementById('message-input').placeholder = `${t.typeMessage} #general`;
  
  const tipsElement = document.getElementById('loading-tips');
  if (tipsElement && loadingTips[currentLanguage]) {
    tipsElement.textContent = loadingTips[currentLanguage][0];
  }
}

function logout() {
  localStorage.removeItem('hivaro_token');
  currentUser = null;
  if (socket) {
    socket.disconnect();
  }
  location.reload();
}

function openCreateServerModal() {
  document.getElementById('create-server-modal').classList.remove('hidden');
}

function closeCreateServerModal() {
  document.getElementById('create-server-modal').classList.add('hidden');
}

async function createServer() {
  const name = document.getElementById('server-name').value.trim();
  if (!name) return;
  
  try {
    const token = localStorage.getItem('hivaro_token');
    const response = await fetch(`${API_URL}/servers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });
    
    if (response.ok) {
      const server = await response.json();
      closeCreateServerModal();
      loadServers();
      loadServer(server._id);
    }
  } catch (error) {
    console.error('Create server error:', error);
  }
}

async function loadAdminStats() {
  try {
    const token = localStorage.getItem('hivaro_token');
    const response = await fetch(`${API_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const stats = await response.json();
      const container = document.getElementById('admin-stats');
      
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
}

function toggleEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  picker.classList.toggle('hidden');
  
  if (!picker.classList.contains('hidden')) {
    loadEmojis();
  }
}

async function loadEmojis() {
  const emojiList = document.getElementById('emoji-list');
  emojiList.innerHTML = '';
  
  const defaultEmojis = ['😀', '😂', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💯', '✅', '❌', '🎮', '🎵', '📱', '💻', '⚡', '🌟', '🚀'];
  
  defaultEmojis.forEach(emoji => {
    const div = document.createElement('div');
    div.className = 'emoji-item';
    div.textContent = emoji;
    div.addEventListener('click', () => {
      const input = document.getElementById('message-input');
      input.value += emoji;
      document.getElementById('emoji-picker').classList.add('hidden');
      input.focus();
    });
    emojiList.appendChild(div);
  });
}

function showTypingIndicator(data) {
  const indicator = document.getElementById('typing-indicator');
  
  if (data.typing) {
    indicator.textContent = `${data.username} is typing...`;
  } else {
    indicator.textContent = '';
  }
  
  setTimeout(() => {
    indicator.textContent = '';
  }, 3000);
}

function showNotification(content, type = 'info') {
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#ED4245' : '#5865F2'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  div.textContent = content;
  
  document.body.appendChild(div);
  
  setTimeout(() => {
    div.remove();
  }, 5000);
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

window.togglePassword = togglePassword;
