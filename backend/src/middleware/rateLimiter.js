// Rate limiting middleware to prevent DOS attacks
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Generic limiter creator
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: message || 'Too many requests, please try again later.' },
    handler: (req, res, next, options) => {
      logger.warn(`[RATE LIMIT] IP blocked: ${req.ip}`);
      res.status(options.statusCode).send(options.message);
    }
  });
};

// Predefined rate limiters
const apiLimiter = createLimiter(1 * 60 * 1000, 300, 'Too many requests to API.'); // 300 per minute
const uploadLimiter = createLimiter(15 * 60 * 1000, 50, 'Too many uploads.');
const strictLimiter = createLimiter(15 * 60 * 1000, 10, 'Too many sensitive attempts.');

module.exports = {
  apiLimiter,
  uploadLimiter,
  strictLimiter
};
