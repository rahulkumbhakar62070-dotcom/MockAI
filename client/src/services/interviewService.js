import api from './api';

/**
 * Interview Service:
 * Directly maps frontend requests to the backend interview & AI generation endpoints.
 */
export const interviewService = {
  /**
   * Generate real AI interview questions using Google Gemini
   * POST /api/interviews/generate-questions
   */
  async generateQuestions({ jobRole, experienceLevel, difficulty, questionCount }, customToken = null) {
    const token = customToken || localStorage.getItem('token');
    const headers = {};
    if (token && typeof token === 'string' && token.trim() !== '') {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const response = await api.post(
      '/interviews/generate-questions',
      {
        jobRole,
        experienceLevel,
        difficulty,
        questionCount,
      },
      {
        headers,
        timeout: 35000,
      }
    );
    return response.data;
  },

  /**
   * Configure and create a new mock interview session
   * POST /api/interviews
   */
  async createInterview(config) {
    const response = await api.post('/interviews', config);
    return response.data;
  },

  /**
   * Fetch authenticated user's real interview history and stats
   * GET /api/interviews
   */
  async getMyInterviews() {
    const response = await api.get('/interviews');
    return response.data;
  },

  /**
   * Fetch authenticated candidate's lightweight interview history
   * GET /api/interviews/history
   */
  async getInterviewHistory() {
    const response = await api.get('/interviews/history');
    return response.data;
  },

  /**
   * Fetch authenticated candidate's performance analytics, chronological trend & role data
   * GET /api/interviews/analytics
   */
  async getPerformanceAnalytics() {
    const response = await api.get('/interviews/analytics');
    return response.data;
  },

  /**
   * Fetch details of a specific interview session
   * GET /api/interviews/:id
   */
  async getInterviewById(id) {
    const response = await api.get(`/interviews/${id}`);
    return response.data;
  },

  /**
   * Start an active interactive interview session
   * POST /api/interviews/start
   */
  async startInterview(payload) {
    const response = await api.post('/interviews/start', payload);
    return response.data;
  },

  /**
   * Submit or update an answer for a question in an active session
   * PUT /api/interviews/:id/answers
   */
  async submitAnswer(id, { questionNumber, answerText, questionIndex }) {
    const response = await api.put(`/interviews/${id}/answers`, {
      questionNumber,
      answerText,
      questionIndex,
    });
    return response.data;
  },

  /**
   * Complete or end an interview session
   * POST /api/interviews/:id/complete
   */
  async completeInterview(id, status = 'completed') {
    const response = await api.post(`/interviews/${id}/complete`, { status });
    return response.data;
  },

  /**
   * Evaluate all submitted answers in an interview session and generate the final report
   * POST /api/interviews/:id/evaluate
   */
  async evaluateSession(id, { forceReevaluate = false } = {}) {
    const response = await api.post(
      `/interviews/${id}/evaluate`,
      { forceReevaluate },
      { timeout: 60000 }
    );
    return response.data;
  },

  /**
   * Evaluate a single submitted question answer
   * POST /api/interviews/:id/questions/:questionNumber/evaluate
   */
  async evaluateQuestion(id, questionNumber, { forceReevaluate = false } = {}) {
    const response = await api.post(
      `/interviews/${id}/questions/${questionNumber}/evaluate`,
      { forceReevaluate },
      { timeout: 35000 }
    );
    return response.data;
  },

  /**
   * Fetch the final evaluation report for an interview session
   * GET /api/interviews/:id/report
   */
  async getInterviewReport(id) {
    const response = await api.get(`/interviews/${id}/report`);
    return response.data;
  },

  /**
   * Generate an AI follow-up question for a specific question based on user's answer
   * POST /api/interviews/:id/questions/:questionNumber/follow-up
   */
  async generateFollowUp(id, questionNumber) {
    const response = await api.post(
      `/interviews/${id}/questions/${questionNumber}/follow-up`,
      {},
      { timeout: 35000 }
    );
    return response.data;
  },
};

export default interviewService;
