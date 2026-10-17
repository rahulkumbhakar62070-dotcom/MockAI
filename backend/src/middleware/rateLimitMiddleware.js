/**
 * In-Memory Sliding-Window Rate Limiting Middleware
 * 
 * Provides lightweight, zero-dependency protection against:
 * 1. Brute-force credential guessing on authentication routes (/login, /register)
 * 2. Rapid exhaustion of AI API quota and compute resources (/generate-questions, /evaluate, etc.)
 * 3. General DoS flooding of API endpoints
 */

class MemoryRateLimiter {
  constructor({ windowMs = 60 * 1000, max = 30, message = 'Too many requests, please try again later.' } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.message = message;
    this.hits = new Map();

    // Clean up expired entries every 2 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (now > record.resetTime) {
          this.hits.delete(key);
        }
      }
    }, 2 * 60 * 1000);

    // Unref timer so it doesn't prevent Node process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  middleware() {
    return (req, res, next) => {
      // Determine client identifier: use authenticated req.userId if available, otherwise IP
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const key = req.userId ? `user_${req.userId}` : `ip_${clientIp}`;

      const now = Date.now();
      let record = this.hits.get(key);

      if (!record || now > record.resetTime) {
        record = {
          count: 1,
          resetTime: now + this.windowMs,
        };
        this.hits.set(key, record);
      } else {
        record.count += 1;
      }

      const remaining = Math.max(0, this.max - record.count);
      const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);

      // Set standard RateLimit HTTP headers
      res.setHeader('RateLimit-Limit', this.max);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', resetInSeconds);

      if (record.count > this.max) {
        res.setHeader('Retry-After', resetInSeconds);
        return res.status(429).json({
          status: 'fail',
          code: 'RATE_LIMIT_EXCEEDED',
          message: this.message,
          retryAfter: resetInSeconds,
        });
      }

      next();
    };
  }
}

/**
 * Authentication Rate Limiter:
 * Allows 20 requests per 15 minutes per IP to block brute-force password guessing.
 */
export const authLimiter = new MemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
}).middleware();

/**
 * AI Generation & Evaluation Rate Limiter:
 * Allows 30 expensive operations per 10 minutes per IP/candidate to prevent Gemini quota exhaustion.
 */
export const aiLimiter = new MemoryRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'AI request limit reached. Please wait a few minutes before generating more questions or evaluations.',
}).middleware();

/**
 * General API Rate Limiter:
 * Allows 300 requests per 15 minutes per IP for general endpoints.
 */
export const apiLimiter = new MemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests sent to the API. Please slow down and try again shortly.',
}).middleware();

export default {
  authLimiter,
  aiLimiter,
  apiLimiter,
};
