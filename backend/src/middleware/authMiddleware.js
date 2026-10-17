import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt.js';

/**
 * Authentication Middleware:
 * Protects private routes by validating the Bearer token in Authorization header.
 * Attaches verified userId to req.userId (ignoring any user ID in request body).
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check if Authorization header exists and has 'Bearer ' format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required. Authorization header with Bearer token is missing.'
      });
    }

    // 2. Extract token string
    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication token missing after Bearer keyword.'
      });
    }

    // 3. Verify token signature and expiration
    const decoded = verifyToken(token);

    // 4. Attach authenticated user's ID to request object (NEVER trust body.userId)
    req.userId = decoded.userId;

    next();
  } catch (error) {
    // Distinguish expired token from invalid token
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Your session has expired. Please log in again.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid authentication token.'
      });
    }

    // Generic error fallback for unforeseen token errors
    return res.status(401).json({
      status: 'fail',
      message: 'Authentication failed. Please log in again.'
    });
  }
};

export default authenticate;
