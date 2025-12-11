/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors automatically
 * Eliminates repetitive try/catch blocks in controllers
 */

const logger = require('../utils/logger');

/**
 * Wraps an async function and forwards any errors to Express error handler
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('[ASYNC_HANDLER] Caught error:', { 
        error: error.message,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    });
  };
};

/**
 * Wraps multiple async handlers for use with router
 * @param {Object} handlers - Object with handler methods
 * @returns {Object} - Object with wrapped handlers
 */
const wrapHandlers = (handlers) => {
  const wrapped = {};
  for (const [name, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      wrapped[name] = asyncHandler(handler);
    }
  }
  return wrapped;
};

module.exports = {
  asyncHandler,
  wrapHandlers
};
