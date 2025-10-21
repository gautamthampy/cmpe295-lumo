/**
 * API client for LUMO backend
 */
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints (placeholders for Phase 2)
export const lessonsAPI = {
  getAll: () => api.get('/lessons'),
  getById: (id: string) => api.get(`/lessons/${id}`),
  render: (id: string, userId: string) => api.get(`/lessons/${id}/render?user_id=${userId}`),
};

export const quizzesAPI = {
  generate: (lessonId: string, userId: string) => 
    api.post('/quizzes/generate', { lesson_id: lessonId, user_id: userId }),
  getById: (id: string) => api.get(`/quizzes/${id}`),
  submit: (id: string, answers: any[]) => api.post(`/quizzes/${id}/submit`, { answers }),
};

export const feedbackAPI = {
  requestHint: (questionId: string, userId: string, sessionId: string) =>
    api.post('/feedback/hint', { question_id: questionId, user_id: userId, session_id: sessionId }),
  getExplanation: (questionId: string, userAnswer: string, correctAnswer: string) =>
    api.post('/feedback/explanation', { question_id: questionId, user_answer: userAnswer, correct_answer: correctAnswer }),
};

export const analyticsAPI = {
  ingestEvent: (event: any) => api.post('/analytics/events', event),
  getDashboard: (userId: string) => api.get(`/analytics/dashboard/${userId}`),
  getAttentionMetrics: (userId: string) => api.get(`/analytics/attention/${userId}`),
  getMasteryScores: (userId: string) => api.get(`/analytics/mastery/${userId}`),
};

export const sessionsAPI = {
  create: (userId: string) => api.post('/sessions', { user_id: userId }),
  end: (sessionId: string) => api.post(`/sessions/${sessionId}/end`),
};

