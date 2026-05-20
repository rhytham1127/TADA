import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  getDesignations: () => api.get('/auth/designations'),
};


export const tadaAPI = {
  createClaim: (data) => api.post('/tada', data),
  getClaims: (status) => api.get(`/tada${status ? `?status=${status}` : ''}`),
  getClaim: (id) => api.get(`/tada/${id}`),
  updateClaim: (id, data) => api.put(`/tada/${id}`, data),
  approveClaim: (id) => api.post(`/tada/${id}/approve`),
  deleteClaim: (id) => api.delete(`/tada/${id}`),
  addExpense: (claimId, data) => api.post(`/tada/${claimId}/expenses`, data)
};

export const bankAPI = {
  saveBankDetails: (data) => api.post('/bank', data),
  getBankDetails: () => api.get('/bank')
};

export const uploadAPI = {
  uploadFiles: (claimId, files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post(`/uploads/${claimId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getFiles: (claimId) => api.get(`/uploads/${claimId}`),
  deleteFile: (fileId) => api.delete(`/uploads/${fileId}`),
  downloadFile: (fileId) => api.get(`/uploads/download/${fileId}`, { responseType: 'blob' })
};

export const adminAPI = {
  getClaims: (params = {}) => api.get('/admin/claims', { params }),
  getClaim: (id) => api.get(`/admin/claims/${id}`),
  getStats: () => api.get('/admin/stats'),
  approveClaim: (id, remarks = '') => api.put(`/admin/claims/${id}/approve`, { remarks }),
  rejectClaim: (id, remarks) => api.put(`/admin/claims/${id}/reject`, { remarks }),
  revertClaim: (id, remarks) => api.put(`/admin/claims/${id}/revert`, { remarks }),
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),
};

export const designationAPI = {
  getAll: () => api.get('/designations'),
};

export default api;
