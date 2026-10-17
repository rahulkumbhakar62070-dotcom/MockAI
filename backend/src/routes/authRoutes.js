import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateRegister, validateLogin } from '../middleware/validationMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account with strict rate limiting & input validation
 * @access  Public
 */
router.post('/register', authLimiter, validateRegister, register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials & return JWT token (rate limited against brute force)
 * @access  Public
 */
router.post('/login', authLimiter, validateLogin, login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (Requires Bearer token)
 */
router.get('/me', authenticate, getMe);

export default router;
