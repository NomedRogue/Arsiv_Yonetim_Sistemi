const logger = require('../logger');

// Enhanced error handler with better error classification
function errorHandler(err, req, res, next) {
  // Log error with additional context
  logger.error('[GLOBAL ERROR HANDLER]', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });

  // Determine status code and appropriate message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Sunucu hatası oluştu.';
  let errorType = 'internal_error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Geçersiz veri gönderildi.';
    errorType = 'validation_error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Geçersiz ID formatı.';
    errorType = 'cast_error';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 400;
    message = 'Veritabanı kısıtlaması ihlali.';
    errorType = 'database_constraint';
  } else if (err.code === 'ENOENT') {
    statusCode = 404;
    message = 'Dosya bulunamadı.';
    errorType = 'file_not_found';
  } else if (err.code === 'EACCES') {
    statusCode = 403;
    message = 'Dosya erişim izni yok.';
    errorType = 'permission_denied';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Yetkisiz erişim.';
    errorType = 'unauthorized';
  }

  // Rate limiting error
  if (err.status === 429) {
    statusCode = 429;
    message = 'Çok fazla istek gönderildi. Lütfen bekleyip tekrar deneyin.';
    errorType = 'rate_limit';
  }

  const errorResponse = {
    error: {
      message: message,
      type: errorType,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  };

  // Add additional context in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      originalError: err.message,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    };
  }

    // Don't expose stack trace in production
  const includeStack = process.env.NODE_ENV !== 'production';
  
  // Send error response
  res.status(statusCode).json({
    error: message,
    type: errorType,
    ...(includeStack && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
}

// Async error wrapper
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler
function notFoundHandler(req, res, next) {
  const error = new Error(`Endpoint bulunamadı: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[UNHANDLED PROMISE REJECTION]', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('[UNCAUGHT EXCEPTION]', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Graceful shutdown
  process.exit(1);
});

module.exports = {
  errorHandler,
  asyncErrorHandler,
  notFoundHandler
};
