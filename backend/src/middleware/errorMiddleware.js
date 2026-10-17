/**
 * 404 Not Found Middleware:
 * Catches requests to routes that are not defined.
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot find ${req.method} ${req.originalUrl} on this server.`
  });
};

/**
 * Global Error Handling Middleware:
 * Catches any unhandled errors passed to next(error).
 * 
 * Security features:
 * 1. Handles Mongoose CastError safely (returns 400 Bad Request instead of 500)
 * 2. Handles Mongoose ValidationError cleanly (returns 400 with field errors)
 * 3. Handles malformed JSON payloads (SyntaxError) from body-parser
 * 4. Normalizes JWT signature/expiration errors (returns 401 Unauthorized)
 * 5. Handles MongoDB duplicate key errors (code 11000 -> 409 Conflict)
 * 6. Completely hides internal stack traces from clients in production
 * 7. Never logs authentication secrets, tokens, or private answer content
 */
export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Malformed JSON Body Error (SyntaxError from express.json())
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'fail',
      message: 'Malformed JSON payload in request body.'
    });
  }

  // 2. Mongoose CastError (e.g., malformed ObjectId in database query)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid format for '${err.path}': '${err.value}'. Must be a valid identifier.`
    });
  }

  // 3. Mongoose Schema ValidationError
  if (err.name === 'ValidationError') {
    const errorMessages = Object.values(err.errors || {}).map((item) => item.message);
    return res.status(400).json({
      status: 'fail',
      message: 'Database validation failed.',
      errors: errorMessages.length > 0 ? errorMessages : [err.message]
    });
  }

  // 4. JWT Verification Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid authentication token.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Your session has expired. Please log in again.'
    });
  }

  // 5. MongoDB Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      status: 'fail',
      message: `A record with this ${field} already exists.`
    });
  }

  // 6. Generic or Custom Status Code
  const statusCode = err.statusCode || 500;

  // Log error on server side for operational debugging (never contains sensitive tokens)
  if (statusCode >= 500) {
    console.error(`💥 [${new Date().toISOString()}] Server Error (${req.method} ${req.originalUrl}):`, err.message);
  }

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message: isProduction && statusCode === 500
      ? 'Internal server error occurred.'
      : err.message || 'Internal server error',
    ...(isProduction ? {} : { stack: err.stack })
  });
};

export default {
  notFoundHandler,
  errorHandler
};
