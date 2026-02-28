import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('lumo_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('lumo_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---- Typed API helpers ----

export const lessonsAPI = {
  getAll: (params?: { subject?: string; grade_level?: number }) =>
    api.get('/lessons', { params }),
  getById: (id: string) => api.get(`/lessons/${id}`),
  render: (id: string, userId: string) =>
    api.get(`/lessons/${id}/render`, { params: { user_id: userId } }),
  create: (data: unknown) => api.post('/lessons', data),
};

export const quizzesAPI = {
  generate: (data: unknown) => api.post('/quizzes/generate', data),
  getById: (id: string) => api.get(`/quizzes/${id}`),
  submit: (id: string, data: unknown) => api.post(`/quizzes/${id}/submit`, data),
};

export const feedbackAPI = {
  requestHint: (data: unknown) => api.post('/feedback/hint', data),
  getExplanation: (data: unknown) => api.post('/feedback/explanation', data),
};

export const analyticsAPI = {
  ingestEvent: (data: unknown) => api.post('/analytics/events', data),
  getDashboard: () => api.get('/analytics/dashboard'),
  getAttentionMetrics: (userId: string) => api.get(`/analytics/attention/${userId}`),
  getMasteryScores: (userId: string) => api.get(`/analytics/mastery/${userId}`),
};

export const sessionsAPI = {
  create: (userId: string) => api.post('/sessions', { user_id: userId }),
  end: (sessionId: string) => api.post(`/sessions/${sessionId}/end`),
};

export const mockAPI = {
  generateQuiz: (data: unknown) => api.post('/mock/generate', data),
  ingestEvent: (data: unknown) => api.post('/mock/events', data),
};
