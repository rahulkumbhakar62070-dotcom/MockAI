import mongoose from 'mongoose';

/**
 * Standard RFC-compliant email regex pattern
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const VALID_EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Experienced'];
const VALID_MODES = ['text', 'audio_video'];
const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const VALID_QUESTION_COUNTS = [5, 10, 15];

/**
 * Middleware: Validate Registration Input
 * Checks that name, email, and password meet criteria before hitting controller.
 * Enforces maximum password length (128 chars) to block bcrypt CPU hashing DoS.
 */
export const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body || {};
  const errors = [];

  // 1. Validate Name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required.');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long.');
  } else if (name.trim().length > 50) {
    errors.push('Name cannot exceed 50 characters.');
  }

  // 2. Validate Email
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email is required.');
  } else if (email.trim().length > 254) {
    errors.push('Email address is too long.');
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push('Please enter a valid email address.');
  }

  // 3. Validate Password
  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  } else if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed.',
      errors,
    });
  }

  next();
};

/**
 * Middleware: Validate Login Input
 * Rejects non-string, missing, or malformed credentials before querying MongoDB.
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email is required.');
  } else if (email.trim().length > 254 || !EMAIL_REGEX.test(email.trim())) {
    errors.push('Please enter a valid email address.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  } else if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed.',
      errors,
    });
  }

  next();
};

/**
 * Middleware Factory: Validate MongoDB ObjectId in URL Parameters
 * Prevents CastErrors from propagating into 500 server errors.
 */
export const validateObjectIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const idValue = req.params[paramName];
    if (!idValue || !mongoose.Types.ObjectId.isValid(idValue)) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid ${paramName} format. Must be a 24-character hexadecimal MongoDB ObjectId.`,
      });
    }
    next();
  };
};

/**
 * Convenient shortcut for :id parameter validation
 */
export const validateInterviewId = validateObjectIdParam('id');

/**
 * Middleware: Validate Question Number in URL parameters
 */
export const validateQuestionNumberParam = (req, res, next) => {
  const qNum = parseInt(req.params.questionNumber, 10);
  if (isNaN(qNum) || qNum < 1) {
    return res.status(400).json({
      status: 'fail',
      message: 'Question number must be a valid positive integer.',
    });
  }
  next();
};

/**
 * Middleware: Validate Interview Configuration & Question Generation Payloads
 */
export const validateInterviewConfig = (req, res, next) => {
  const { role, jobRole, experienceLevel, mode, difficulty, questionCount } = req.body || {};
  const targetRole = typeof (role || jobRole) === 'string' ? (role || jobRole).trim() : '';
  const errors = [];

  // 1. Role validation
  if (!targetRole || targetRole.length === 0) {
    errors.push('Job role is required.');
  } else if (targetRole.length < 2) {
    errors.push('Job role must be at least 2 characters long.');
  } else if (targetRole.length > 100) {
    errors.push('Job role cannot exceed 100 characters.');
  }

  // 2. Experience level validation
  if (!experienceLevel || !VALID_EXPERIENCE_LEVELS.includes(experienceLevel)) {
    errors.push(`Experience level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}.`);
  }

  // 3. Difficulty validation
  if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
    errors.push(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}.`);
  }

  // 4. Mode validation (if provided)
  if (mode !== undefined && !VALID_MODES.includes(mode)) {
    errors.push('Interview mode must be either "text" or "audio_video".');
  }

  // 5. Question count validation
  const parsedCount = Number(questionCount);
  if (!questionCount || !VALID_QUESTION_COUNTS.includes(parsedCount)) {
    errors.push('Question count must be 5, 10, or 15.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed for interview configuration.',
      errors,
    });
  }

  next();
};

/**
 * Middleware: Validate Answer Submission Payload
 * Restricts answerText to 10,000 characters to prevent database bloat and Gemini token overflow.
 */
export const validateSubmitAnswer = (req, res, next) => {
  const { questionNumber, answerText, questionIndex } = req.body || {};
  const errors = [];

  const targetNumber = Number(
    questionNumber !== undefined ? questionNumber : (questionIndex !== undefined ? Number(questionIndex) + 1 : 0)
  );

  if (!targetNumber || isNaN(targetNumber) || targetNumber < 1) {
    errors.push('Valid questionNumber is required (positive integer).');
  }

  if (answerText === undefined || answerText === null) {
    errors.push('answerText is required.');
  } else if (typeof answerText !== 'string') {
    errors.push('answerText must be a string.');
  } else if (answerText.length > 10000) {
    errors.push('answerText exceeds maximum allowed length of 10,000 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed for answer submission.',
      errors,
    });
  }

  next();
};

export default {
  validateRegister,
  validateLogin,
  validateObjectIdParam,
  validateInterviewId,
  validateQuestionNumberParam,
  validateInterviewConfig,
  validateSubmitAnswer,
};
