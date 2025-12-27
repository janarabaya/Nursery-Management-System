/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and attaches user information to the request.
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { unauthorized, forbidden } = require('../utils/responses');

/**
 * Extract Bearer token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} - Token or null if not found
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  // Check for Bearer token format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  return null;
}

/**
 * Authentication middleware - requires valid JWT token
 * Attaches user info to req.user on success
 */
function authenticate(req, res, next) {
  const token = extractToken(req);
  
  if (!token) {
    return unauthorized(res, 'No token provided');
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      roles: decoded.roles || [decoded.role],
      role: decoded.role || (decoded.roles && decoded.roles[0])
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return forbidden(res, 'Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      return forbidden(res, 'Invalid token');
    }
    return forbidden(res, 'Token verification failed');
  }
}

/**
 * Optional authentication middleware
 * Does not require token but will attach user if valid token present
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      roles: decoded.roles || [decoded.role],
      role: decoded.role || (decoded.roles && decoded.roles[0])
    };
  } catch (error) {
    req.user = null;
  }
  
  next();
}

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with id, email, roles
 * @returns {string} - Signed JWT token
 */
function generateToken(user) {
  const { JWT_EXPIRES_IN } = require('../config/env');
  
  const payload = {
    id: user.id,
    email: user.email,
    role: user.roles[0],
    roles: user.roles
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

module.exports = {
  authenticate,
  optionalAuth,
  generateToken,
  extractToken
};


