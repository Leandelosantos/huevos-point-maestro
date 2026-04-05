import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Adjuntar JWT en cada request
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('dm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Redirigir al login en 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('dm_token');
      sessionStorage.removeItem('dm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;