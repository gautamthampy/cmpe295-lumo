import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL: BASE_URL });

// Attach JWT — student tokens in sessionStorage, parent tokens in localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token =
      sessionStorage.getItem('lumo_token') ||  // student (session-scoped)
      localStorage.getItem('lumo_token');        // parent (persistent)
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear tokens and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('lumo_token');
      sessionStorage.removeItem('lumo_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---- Auth API ----

export const authAPI = {
  registerParent: (data: { email: string; password: string; display_name: string }) =>
    api.post('/auth/register', data),
  loginParent: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  loginStudent: (studentId: string, pin: string) =>
    api.post(`/auth/students/${studentId}/login`, { pin }),
  getMe: () => api.get('/auth/me'),
  createStudent: (data: {
    display_name: string;
    grade_level: number;
    pin: string;
    avatar_id?: string;
    consent_given?: boolean;
  }) => api.post('/auth/students', data),
  updateStudent: (studentId: string, data: object) =>
    api.put(`/auth/students/${studentId}`, data),
  enrollSubject: (studentId: string, subjectId: string) =>
    api.post(`/auth/students/${studentId}/subjects`, { subject_id: subjectId }),
  unenrollSubject: (studentId: string, subjectId: string) =>
    api.delete(`/auth/students/${studentId}/subjects/${subjectId}`),
  listSubjects: () => api.get('/auth/subjects'),
  getStudent: (studentId: string) => api.get(`/auth/students/${studentId}`),
};

// ---- Typed API helpers ----

export const lessonsAPI = {
  getAll: (params?: { subject?: string; grade_level?: number }) =>
    api.get('/lessons', { params }),
  getById: (id: string) => api.get(`/lessons/${id}`),
  render: (id: string, userId: string, masteryScore?: number) =>
    api.get(`/lessons/${id}/render`, {
      params: {
        user_id: userId,
        ...(masteryScore !== undefined ? { mastery_score: masteryScore } : {}),
      },
    }),
  create: (data: unknown) => api.post('/lessons', data),
  generate: (data: {
    topic: string;
    grade_level?: number;
    subject?: string;
    strategy?: 'zpd' | 'misconception' | 'bkt' | 'hybrid';
    save_as_draft?: boolean;
    student_id?: string;
  }) => api.post('/lessons/generate', data),
  preview: (data: { content_mdx: string; grade_level: number }) =>
    api.post('/lessons/preview', data),
  publish: (id: string) => api.post(`/lessons/${id}/publish`),
  revise: (id: string, data: unknown) => api.post(`/lessons/${id}/revise`, data),
  accessibilityReport: () => api.get('/lessons/accessibility-report'),
  analyticsSummary: () => api.get('/lessons/analytics/summary'),
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

export const diagnosticsAPI = {
  generate: (data: { student_id: string; subject_id: string; topic_id?: string }) =>
    api.post('/diagnostics/generate', data),
  get: (assessmentId: string) => api.get(`/diagnostics/${assessmentId}`),
  submit: (assessmentId: string, responses: Array<{ activity_id: string; answer: string }>) =>
    api.post(`/diagnostics/${assessmentId}/submit`, { responses }),
  getResults: (studentId: string) => api.get(`/diagnostics/results/${studentId}`),
};

export const evaluationAPI = {
  strategyComparison: (params?: { subject?: string; grade?: number }) =>
    api.get('/evaluation/strategy-comparison', { params }),
  listRuns: (params?: { strategy?: string; limit?: number }) =>
    api.get('/evaluation/runs', { params }),
};
