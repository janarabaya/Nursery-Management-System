/**
 * Role-Based Access Control Middleware
 * 
 * Provides middleware functions for restricting access based on user roles.
 */

const { forbidden } = require('../utils/responses');

// Available roles in the system
const ROLES = {
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  AGRICULTURE_ENGINEER: 'agriculture_engineer',
  DELIVERY_COMPANY: 'delivery_company'
};

// Role aliases (frontend may use different names)
const ROLE_ALIASES = {
  'agricultural_engineer': 'agriculture_engineer',
  'engineer': 'agriculture_engineer',
  'delivery': 'delivery_company',
  'admin': 'manager'
};

/**
 * Normalize role name (handle aliases)
 * @param {string} role - Role name
 * @returns {string} - Normalized role name
 */
function normalizeRole(role) {
  if (!role) return role;
  const lower = role.toLowerCase();
  return ROLE_ALIASES[lower] || lower;
}

/**
 * Check if user has a specific role
 * @param {Object} user - User object with roles array
 * @param {string} role - Role to check for
 * @returns {boolean}
 */
function hasRole(user, role) {
  if (!user || !user.roles) return false;
  const normalizedRole = normalizeRole(role);
  return user.roles.some(r => normalizeRole(r) === normalizedRole);
}

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object with roles array
 * @param {Array<string>} roles - Roles to check for
 * @returns {boolean}
 */
function hasAnyRole(user, roles) {
  if (!user || !user.roles) return false;
  return roles.some(role => hasRole(user, role));
}

/**
 * Create middleware that requires a specific role
 * @param {string} role - Required role
 * @returns {Function} - Express middleware
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Authentication required');
    }
    
    if (!hasRole(req.user, role)) {
      return forbidden(res, `Access denied. Required role: ${role}`);
    }
    
    next();
  };
}

/**
 * Create middleware that requires any of the specified roles
 * @param {Array<string>} roles - Array of acceptable roles
 * @returns {Function} - Express middleware
 */
function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Authentication required');
    }
    
    if (!hasAnyRole(req.user, roles)) {
      return forbidden(res, `Access denied. Required roles: ${roles.join(' or ')}`);
    }
    
    next();
  };
}

// ============================================
// PRE-BUILT ROLE GUARDS
// ============================================

/**
 * Manager only access
 */
const adminOnly = requireRole(ROLES.MANAGER);

/**
 * Staff access (manager or employee)
 */
const staffOnly = requireAnyRole([ROLES.MANAGER, ROLES.EMPLOYEE]);

/**
 * Customer only access
 */
const customerOnly = requireRole(ROLES.CUSTOMER);

/**
 * Agriculture engineer only access
 */
const engineerOnly = requireRole(ROLES.AGRICULTURE_ENGINEER);

/**
 * Supplier only access
 */
const supplierOnly = requireRole(ROLES.SUPPLIER);

/**
 * Delivery company only access
 */
const deliveryOnly = requireRole(ROLES.DELIVERY_COMPANY);

/**
 * Manager or engineer access
 */
const managerOrEngineer = requireAnyRole([ROLES.MANAGER, ROLES.AGRICULTURE_ENGINEER]);

/**
 * Any authenticated user (for endpoints that just need login)
 */
const anyAuthenticated = (req, res, next) => {
  if (!req.user) {
    return forbidden(res, 'Authentication required');
  }
  next();
};

module.exports = {
  ROLES,
  ROLE_ALIASES,
  normalizeRole,
  hasRole,
  hasAnyRole,
  requireRole,
  requireAnyRole,
  adminOnly,
  staffOnly,
  customerOnly,
  engineerOnly,
  supplierOnly,
  deliveryOnly,
  managerOrEngineer,
  anyAuthenticated
};


