/**
 * Authentication Routes
 * 
 * POST /api/auth/register - Register a new user
 * POST /api/auth/login - User login
 */

const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/accessDb');
const { hashPassword, comparePassword } = require('../utils/hashing');
const { generateToken, authenticate } = require('../middleware/auth');
const { ok, created, badRequest, unauthorized, serverError } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const registerSchema = Joi.object({
  role: Joi.string().valid(
    'manager', 'supplier', 'customer', 'employee', 
    'agriculture_engineer', 'agricultural_engineer', 'delivery_company'
  ).required(),
  username: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().allow('', null).optional(),
  address: Joi.string().allow('', null).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// ============================================
// POST /api/auth/register
// ============================================

router.post('/register', asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  let { role, username, email, password, phone, address } = value;
  email = email.toLowerCase();
  
  // Normalize role name
  if (role === 'agricultural_engineer') {
    role = 'agriculture_engineer';
  }
  
  // Check if user already exists
  const existingUsers = await db.query(
    `SELECT ID FROM Users WHERE Email = ${db.escapeSQL(email)}`
  );
  
  if (existingUsers && existingUsers.length > 0) {
    return badRequest(res, 'User with this email already exists');
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Generate user ID
  const userId = uuidv4();
  
  // Get role ID
  const roles = await db.query(
    `SELECT ID FROM Roles WHERE Name = ${db.escapeSQL(role)}`
  );
  
  if (!roles || roles.length === 0) {
    return badRequest(res, 'Invalid role specified');
  }
  
  const roleId = roles[0].ID;
  
  // Insert user
  await db.execute(db.buildInsert('Users', {
    ID: userId,
    Email: email,
    PasswordHash: passwordHash,
    FullName: username,
    Phone: phone || '',
    Status: 'active',
    CreatedAt: new Date(),
    UpdatedAt: new Date()
  }));
  
  // Create user-role association
  await db.execute(db.buildInsert('UserRoles', {
    UserID: userId,
    RoleID: roleId
  }));
  
  // Create role-specific profile
  if (role === 'customer') {
    await db.execute(db.buildInsert('Customers', {
      UserID: userId,
      Address: address || '',
      City: '',
      Country: ''
    }));
  } else if (role === 'employee' || role === 'agriculture_engineer') {
    await db.execute(db.buildInsert('Employees', {
      UserID: userId,
      Title: role === 'agriculture_engineer' ? 'Agricultural Engineer' : 'Employee',
      IsActive: true,
      HiredAt: new Date()
    }));
  } else if (role === 'supplier') {
    await db.execute(db.buildInsert('Suppliers', {
      UserID: userId,
      CompanyName: username,
      ContactName: username,
      Email: email,
      Phone: phone || '',
      IsActive: true
    }));
  }
  
  // Generate token
  const token = generateToken({
    id: userId,
    email: email,
    roles: [role]
  });
  
  // Return response matching frontend expectations
  created(res, {
    token,
    user: {
      id: userId,
      email: email,
      full_name: username,
      role: role,
      roles: [role]
    }
  });
}));

// ============================================
// POST /api/auth/login
// ============================================

router.post('/login', asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { email, password } = value;
  const normalizedEmail = email.toLowerCase();
  
  // Find user by email with their roles
  const users = await db.query(`
    SELECT u.ID, u.Email, u.PasswordHash, u.FullName, u.Phone, u.Status, r.Name as RoleName
    FROM Users u
    INNER JOIN UserRoles ur ON u.ID = ur.UserID
    INNER JOIN Roles r ON ur.RoleID = r.ID
    WHERE u.Email = ${db.escapeSQL(normalizedEmail)}
  `);
  
  if (!users || users.length === 0) {
    return unauthorized(res, 'Invalid email or password');
  }
  
  const user = users[0];
  
  // Check if user is active
  if (user.Status !== 'active') {
    return unauthorized(res, 'Account is inactive');
  }
  
  // Verify password
  const isValidPassword = await comparePassword(password, user.PasswordHash);
  
  if (!isValidPassword) {
    return unauthorized(res, 'Invalid email or password');
  }
  
  // Get all roles for user (in case of multiple roles)
  const userRoles = users.map(u => u.RoleName);
  const primaryRole = userRoles[0];
  
  // Generate token
  const token = generateToken({
    id: user.ID,
    email: user.Email,
    roles: userRoles
  });
  
  // Return response matching frontend expectations
  ok(res, {
    token,
    user: {
      id: user.ID,
      email: user.Email,
      full_name: user.FullName,
      phone: user.Phone,
      role: primaryRole,
      roles: userRoles
    }
  });
}));

// ============================================
// GET /api/auth/verify - Verify token
// ============================================

router.get('/verify', authenticate, (req, res) => {
  ok(res, {
    valid: true,
    user: req.user
  });
});

module.exports = router;


