import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';

/**
 * Controller: Register a new user
 * Route: POST /api/auth/register
 * Access: Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1. Normalize email to lowercase and trim whitespace
    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        status: 'fail',
        message: 'An account with this email is already registered.'
      });
    }

    // 3. Create new user (password is automatically hashed by UserSchema pre-save hook)
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password
    });

    await user.save();

    // 4. Return safe user object (toJSON in schema strips password and __v)
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (code 11000) for concurrency safety
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'fail',
        message: 'An account with this email is already registered.'
      });
    }

    // Pass unexpected errors to centralized error handling middleware
    next(error);
  }
};

/**
 * Controller: Log in an existing user
 * Route: POST /api/auth/login
 * Access: Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find user by email and explicitly select password (as select: false in schema)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // 3. Check if user exists
    if (!user) {
      // Generic message to prevent user enumeration attacks
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password.'
      });
    }

    // 4. Verify password with bcryptjs
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Identical generic message for bad password
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password.'
      });
    }

    // 5. Generate signed JWT token
    const token = generateToken(user._id.toString());

    // 6. Return token and safe user info (without password)
    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully.',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get current authenticated user profile
 * Route: GET /api/auth/me
 * Access: Private (Requires Bearer Token)
 */
export const getMe = async (req, res, next) => {
  try {
    // req.userId is set by the authMiddleware from the verified JWT payload
    const user = await User.findById(req.userId).select('-password');

    // If user was deleted or no longer exists in DB
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User no longer exists.'
      });
    }

    // Return safe user profile
    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
