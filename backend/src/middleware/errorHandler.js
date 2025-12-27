/**
 * Error Handling Middleware
 * 
 * Central error handler for the application.
 * Catches all errors passed via next(err) and returns standardized responses.
 */

const { IS_DEV } = require('../config/env');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
  
  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }
  
  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}

/**
 * Global error handler middleware
 * Should be registered last in the middleware chain
 */
function errorHandler(err, req, res, next) {
  // Log error in development
  if (IS_DEV) {
    console.error('[ERROR]', err);
  }
  
  // Handle Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }
  
  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details })
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(403).json({
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(403).json({
      error: 'Token expired'
    });
  }
  
  // Handle database errors
  if (err.message && err.message.includes('ADODB')) {
    return res.status(500).json({
      error: 'Database error',
      message: IS_DEV ? err.message : 'A database error occurred'
    });
  }
  
  // Handle syntax errors in JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON in request body'
    });
  }
  
  // Default to 500 Internal Server Error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : message,
    ...(IS_DEV && { stack: err.stack, originalMessage: message })
  });
}

/**
 * 404 Not Found handler for undefined routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function that catches errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};


