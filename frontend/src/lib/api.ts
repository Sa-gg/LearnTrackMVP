import axios from 'axios';

/**
 * Pre-configured Axios instance pointing at the LearnTrack backend.
 *
 * Usage:
 *   import api from '../lib/api';
 *   const { data } = await api.get('/api/quizzes');
 */
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth tokens here when ready
api.interceptors.request.use((config) => {
  // const token = localStorage.getItem('token');
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — centralised error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response?.status, error.response?.data);
    return Promise.reject(error);
  },
);

export default api;
