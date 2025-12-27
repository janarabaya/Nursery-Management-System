/**
 * HTTP Response Helpers
 * 
 * Standardized response functions for consistent API responses.
 * All responses follow the format expected by the frontend.
 */

/**
 * Send a successful response (200 OK)
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} [message] - Optional success message
 */
function ok(res, data, message) {
  const response = data;
  if (message && typeof data === 'object' && !Array.isArray(data)) {
    response.message = message;
  }
  res.status(200).json(response);
}

/**
 * Send a created response (201 Created)
 * @param {Object} res - Express response object
 * @param {any} data - Created resource data
 * @param {string} [message] - Optional success message
 */
function created(res, data, message) {
  const response = data;
  if (message && typeof data === 'object' && !Array.isArray(data)) {
    response.message = message;
  }
  res.status(201).json(response);
}

/**
 * Send a bad request error (400)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function badRequest(res, message) {
  res.status(400).json({ error: message });
}

/**
 * Send an unauthorized error (401)
 * @param {Object} res - Express response object
 * @param {string} [message='Unauthorized'] - Error message
 */
function unauthorized(res, message = 'Unauthorized') {
  res.status(401).json({ error: message });
}

/**
 * Send a forbidden error (403)
 * @param {Object} res - Express response object
 * @param {string} [message='Forbidden'] - Error message
 */
function forbidden(res, message = 'Forbidden') {
  res.status(403).json({ error: message });
}

/**
 * Send a not found error (404)
 * @param {Object} res - Express response object
 * @param {string} [message='Not found'] - Error message
 */
function notFound(res, message = 'Not found') {
  res.status(404).json({ error: message });
}

/**
 * Send a server error (500)
 * @param {Object} res - Express response object
 * @param {Error|string} error - Error object or message
 */
function serverError(res, error) {
  const message = error instanceof Error ? error.message : error;
  console.error('[SERVER ERROR]', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? message : undefined
  });
}

/**
 * Send a success response with pagination info
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info { page, limit, total }
 */
function paginated(res, data, pagination) {
  res.status(200).json({
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit)
    }
  });
}

module.exports = {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  paginated
};


