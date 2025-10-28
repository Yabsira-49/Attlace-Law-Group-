/**
 * ATTLES LAW GROUP - API UTILITY
 * Centralized API communication with backend
 * Base URL: http://localhost:5000/api
 */

const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
  TIMEOUT: 30000 // 30 seconds
};

class APIClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  getHeaders(includeAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (includeAuth) {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.authenticated),
        ...options.headers
      }
    };
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      if (!response.ok) {
        throw {
          status: response.status,
          message: data.error || data.message || 'An error occurred',
          data: data
        };
      }
      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw {
          status: 0,
          message: 'Network error. Please check your connection.',
          data: null
        };
      }
      throw error;
    }
  }

  async get(endpoint, authenticated = false) {
    return this.request(endpoint, {
      method: 'GET',
      authenticated
    });
  }

  async post(endpoint, data, authenticated = false) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      authenticated
    });
  }

  async put(endpoint, data, authenticated = false) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      authenticated
    });
  }

  async patch(endpoint, data, authenticated = false) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      authenticated
    });
  }

  async delete(endpoint, authenticated = false) {
    return this.request(endpoint, {
      method: 'DELETE',
      authenticated
    });
  }
}

class API {
  constructor() {
    this.client = new APIClient();
  }

  // AUTH ENDPOINTS
  async register(userData) {
    return this.client.post('/auth/register', userData);
  }
  async verifyEmail(email, code) {
    return this.client.post('/auth/verify-email', { email, code });
  }
  async login(email, password) {
    return this.client.post('/auth/login', { email, password });
  }
  async forgotPassword(email) {
    return this.client.post('/auth/forgot-password', { email });
  }
  async resetPassword(token, newPassword) {
    return this.client.post('/auth/reset-password', { token, newPassword });
  }

  // ADMIN ENDPOINTS
  async getUsers() {
    return this.client.get('/admin/users', true);
  }
  async searchUsers(query, status, from, to) {
    let queryString = '';
    if (query) queryString += `query=${encodeURIComponent(query)}&`;
    if (status) queryString += `status=${encodeURIComponent(status)}&`;
    if (from) queryString += `from=${encodeURIComponent(from)}&`;
    if (to) queryString += `to=${encodeURIComponent(to)}&`;
    return this.client.get(`/admin/users/search?${queryString}`, true);
  }
  async setUserStatus(userId, status) {
    return this.client.patch(`/admin/users/status/${userId}`, { status }, true);
  }
  async getUserForms(userId) {
    return this.client.get(`/admin/users/${userId}/forms`, true);
  }
  async deleteUser(userId) {
    return this.client.delete(`/admin/users/${userId}`, true);
  }
  async getFormStats() {
    return this.client.get('/admin/forms/stats', true);
  }
  async getFormsPerUser() {
    return this.client.get('/admin/forms/per-user', true);
  }
  async setFormPricing(formType, price) {
    return this.client.post('/admin/forms/pricing', { formType, price }, true);
  }
  async getFormPricing() {
    return this.client.get('/admin/forms/pricing', true);
  }
  async getFormHistory(formType, status, from, to) {
    let queryString = '';
    if (formType) queryString += `form_type=${encodeURIComponent(formType)}&`;
    if (status) queryString += `status=${encodeURIComponent(status)}&`;
    if (from) queryString += `from=${encodeURIComponent(from)}&`;
    if (to) queryString += `to=${encodeURIComponent(to)}&`;
    return this.client.get(`/admin/forms/history?${queryString}`, true);
  }
  async updateAdminProfile(profileData) {
    return this.client.put('/admin/profile', profileData, true);
  }
  async changeAdminPassword(currentPassword, newPassword) {
    return this.client.post('/admin/change-password', { currentPassword, newPassword }, true);
  }
  async updateStripeKey(stripeKey) {
    return this.client.post('/admin/stripe-key', { stripeKey }, true);
  }
  async getSystemLogs() {
    return this.client.get('/admin/logs', true);
  }

  // SUBADMIN ENDPOINTS
  async listSubAdmins() {
    return this.client.get('/subadmin/list', true);
  }
  async createSubAdmin(name, email, password) {
    return this.client.post('/subadmin/create', { name, email, password }, true);
  }
  async deleteSubAdmin(subAdminId) {
    return this.client.delete(`/subadmin/delete/${subAdminId}`, true);
  }
  async updateSubAdmin(subAdminId, data) {
    return this.client.put(`/subadmin/update/${subAdminId}`, data, true);
  }

  // LOGOUT and USER INFO
  getCurrentUser() {
    // Loads user info from localStorage
    return new Promise((resolve, reject) => {
      const userRaw =
        localStorage.getItem('user') ||
        localStorage.getItem('userInfo') ||
        localStorage.getItem('currentUser');
      if (!userRaw) return reject(new Error('No user info found'));
      try {
        resolve(JSON.parse(userRaw));
      } catch {
        reject(new Error('Invalid user info'));
      }
    });
  }
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberedEmail');
  }
}

const api = new API();
window.api = api;
