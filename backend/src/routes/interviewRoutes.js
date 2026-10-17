import express from 'express';
import {
  createInterview,
  getMyInterviews,
  getInterviewHistory,
  getInterviewById,
  generateQuestions,
  generateQuestionsForSession,
  startInterviewSession,
  submitAnswer,
  generateFollowUpQuestion,
  completeInterviewSession,
  evaluateInterviewSession,
  evaluateSingleQuestionAnswer,
  getInterviewReport,
  getInterviewAnalytics,
} from '../controllers/interviewController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  validateInterviewId,
  validateQuestionNumberParam,
  validateInterviewConfig,
  validateSubmitAnswer,
} from '../middleware/validationMiddleware.js';
import { aiLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// All interview endpoints strictly require valid JWT authentication
router.use(authenticate);

/**
 * @route   POST /api/interviews/generate-questions
 * @desc    Generate AI interview questions with Gemini based on role, level & difficulty
 * @access  Private (Requires Bearer token, rate limited & validated)
 */
router.post('/generate-questions', aiLimiter, validateInterviewConfig, generateQuestions);

/**
 * @route   POST /api/interviews/start
 * @desc    Start an active interactive interview session
 * @access  Private
 */
router.post('/start', startInterviewSession);

/**
 * @route   PUT /api/interviews/:id/answers
 * @desc    Submit or update answer for a specific question in an active interview
 * @access  Private (Validated ObjectId & payload)
 */
router.put('/:id/answers', validateInterviewId, validateSubmitAnswer, submitAnswer);

/**
 * @route   POST /api/interviews/:id/questions/:questionNumber/follow-up
 * @desc    Generate an AI follow-up question for a specific question based on user answer
 * @access  Private (Rate limited, validated ID & questionNumber)
 */
router.post(
  '/:id/questions/:questionNumber/follow-up',
  aiLimiter,
  validateInterviewId,
  validateQuestionNumberParam,
  generateFollowUpQuestion
);

/**
 * @route   POST /api/interviews/:id/complete
 * @desc    Conclude an interview session (mark completed or abandoned)
 * @access  Private (Validated ObjectId)
 */
router.post('/:id/complete', validateInterviewId, completeInterviewSession);

/**
 * @route   POST /api/interviews
 * @desc    Configure and create a new interview session
 * @access  Private (Validated config)
 */
router.post('/', validateInterviewConfig, createInterview);

/**
 * @route   GET /api/interviews
 * @desc    Get all interview sessions and stats for authenticated user
 * @access  Private
 */
router.get('/', getMyInterviews);

/**
 * @route   GET /api/interviews/history
 * @desc    Get authenticated candidate's lightweight interview history
 * @access  Private
 */
router.get('/history', getInterviewHistory);

/**
 * @route   GET /api/interviews/analytics
 * @desc    Get candidate's performance analytics, chronological trend & role comparison
 * @access  Private
 */
router.get('/analytics', getInterviewAnalytics);

/**
 * @route   GET /api/interviews/:id
 * @desc    Get single interview session details
 * @access  Private (Validated ObjectId)
 */
router.get('/:id', validateInterviewId, getInterviewById);

/**
 * @route   POST /api/interviews/:id/generate-questions
 * @desc    Generate and save AI interview questions directly for an existing session
 * @access  Private (Rate limited, validated ObjectId)
 */
router.post('/:id/generate-questions', aiLimiter, validateInterviewId, generateQuestionsForSession);

/**
 * @route   POST /api/interviews/:id/evaluate
 * @desc    Evaluate all submitted answers in an interview session & generate final report
 * @access  Private (Rate limited, validated ObjectId)
 */
router.post('/:id/evaluate', aiLimiter, validateInterviewId, evaluateInterviewSession);

/**
 * @route   POST /api/interviews/:id/questions/:questionNumber/evaluate
 * @desc    Evaluate an individual submitted answer for a specific question
 * @access  Private (Rate limited, validated ObjectId & questionNumber)
 */
router.post(
  '/:id/questions/:questionNumber/evaluate',
  aiLimiter,
  validateInterviewId,
  validateQuestionNumberParam,
  evaluateSingleQuestionAnswer
);

/**
 * @route   GET /api/interviews/:id/report
 * @desc    Get the final interview evaluation report and question evaluations
 * @access  Private (Validated ObjectId)
 */
router.get('/:id/report', validateInterviewId, getInterviewReport);

export default router;
