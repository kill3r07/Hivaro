// Authentication helper functions

const Auth = {
  token: null,
  user: null,

  init() {
    this.token = localStorage.getItem('hivaro_token');
    if (this.token) {
      this.setAuthHeader();
    }
  },

  setAuthHeader() {
    this.token = localStorage.getItem('hivaro_token');
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  },

  async register(username, password) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.saveToken(data.token);
        this.user = data.user;
        return { success: true, user: data.user };
      }
      
      return { success: false, error: data.message };
    } catch (error) {
      return { success: false, error: 'Connection error' };
    }
  },

  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.saveToken(data.token);
        this.user = data.user;
        return { success: true, user: data.user };
      }
      
      return { success: false, error: data.message };
    } catch (error) {
      return { success: false, error: 'Connection error' };
    }
  },

  saveToken(token) {
    this.token = token;
    localStorage.setItem('hivaro_token', token);
  },

  clearToken() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('hivaro_token');
  },

  async verify() {
    if (!this.token) return false;
    
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        headers: this.setAuthHeader()
      });
      
      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        return true;
      }
      
      this.clearToken();
      return false;
    } catch (error) {
      this.clearToken();
      return false;
    }
  },

  isAuthenticated() {
    return !!this.token;
  },

  isOwner() {
    return this.user?.isOwner || false;
  },

  getUser() {
    return this.user;
  },

  getToken() {
    return this.token;
  }
};

// Initialize auth on load
Auth.init();
