/**
 * Employees Routes
 * 
 * GET /api/employees - Get all employees (manager)
 * POST /api/employees - Create employee (manager)
 * PUT /api/employees/:userId - Update employee (manager)
 * PATCH /api/employees/:userId/status - Update status (manager)
 * DELETE /api/employees/:userId - Delete employee (manager)
 * GET /api/employees/count - Get employee count
 */

const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly, staffOnly } = require('../middleware/roles');
const { hashPassword } = require('../utils/hashing');
const { ok, created, badRequest, notFound } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createEmployeeSchema = Joi.object({
  full_name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().required(),
  title: Joi.string().optional(),
  department: Joi.string().optional(),
  phone: Joi.string().allow('', null).optional()
});

const updateEmployeeSchema = Joi.object({
  full_name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().optional(),
  title: Joi.string().optional(),
  department: Joi.string().optional(),
  phone: Joi.string().allow('', null).optional()
});

// ============================================
// GET /api/employees/count - Get count
// ============================================

router.get('/count', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const result = await db.query(`SELECT COUNT(*) as count FROM Employees WHERE IsActive = TRUE`);
  ok(res, { count: result[0]?.count || 0 });
}));

// ============================================
// GET /api/employees - Manager: Get all
// ============================================

router.get('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const employees = await db.query(`
    SELECT e.UserID as user_id, e.Title as title, e.IsActive as is_active,
           e.HiredAt as hired_at, u.Email as email, u.FullName as full_name,
           u.Phone as phone, u.Status as status, r.Name as role
    FROM Employees e
    INNER JOIN Users u ON e.UserID = u.ID
    LEFT JOIN UserRoles ur ON u.ID = ur.UserID
    LEFT JOIN Roles r ON ur.RoleID = r.ID
    ORDER BY e.HiredAt DESC
  `);
  
  const formattedEmployees = employees.map(e => ({
    id: e.user_id,
    user_id: e.user_id,
    email: e.email,
    full_name: e.full_name,
    phone: e.phone,
    role: e.role,
    title: e.title,
    is_active: Boolean(e.is_active),
    hired_at: e.hired_at,
    user: {
      id: e.user_id,
      email: e.email,
      full_name: e.full_name,
      phone: e.phone,
      status: e.status
    }
  }));
  
  ok(res, formattedEmployees);
}));

// ============================================
// POST /api/employees - Manager: Create
// ============================================

router.post('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { error, value } = createEmployeeSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { full_name, email, password, role, title, department, phone } = value;
  const normalizedEmail = email.toLowerCase();
  
  // Check if user exists
  const existing = await db.query(`SELECT ID FROM Users WHERE Email = ${db.escapeSQL(normalizedEmail)}`);
  if (existing && existing.length > 0) {
    return badRequest(res, 'User with this email already exists');
  }
  
  // Hash password
  const passwordHash = await hashPassword(password || 'TempPassword123!');
  const userId = uuidv4();
  
  // Get role ID
  const roles = await db.query(`SELECT ID FROM Roles WHERE Name = ${db.escapeSQL(role)}`);
  if (!roles || roles.length === 0) {
    return badRequest(res, 'Invalid role specified');
  }
  
  // Create user
  await db.execute(db.buildInsert('Users', {
    ID: userId,
    Email: normalizedEmail,
    PasswordHash: passwordHash,
    FullName: full_name,
    Phone: phone || '',
    Status: 'active',
    CreatedAt: new Date(),
    UpdatedAt: new Date()
  }));
  
  // Assign role
  await db.execute(db.buildInsert('UserRoles', {
    UserID: userId,
    RoleID: roles[0].ID
  }));
  
  // Create employee record
  await db.execute(db.buildInsert('Employees', {
    UserID: userId,
    Title: title || department || 'Employee',
    IsActive: true,
    HiredAt: new Date()
  }));
  
  created(res, {
    id: userId,
    user_id: userId,
    email: normalizedEmail,
    full_name: full_name,
    role: role,
    title: title || department || 'Employee',
    department: department || null,
    is_active: true
  });
}));

// ============================================
// PUT /api/employees/:userId - Manager: Update
// ============================================

router.put('/:userId', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const { error, value } = updateEmployeeSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Check if employee exists
  const existing = await db.query(`SELECT UserID FROM Employees WHERE UserID = ${db.escapeSQL(userId)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Employee not found');
  }
  
  const { full_name, email, role, title, department, phone } = value;
  
  // Update user record
  const userUpdate = { UpdatedAt: new Date() };
  if (full_name) userUpdate.FullName = full_name;
  if (email) userUpdate.Email = email.toLowerCase();
  if (phone !== undefined) userUpdate.Phone = phone;
  
  await db.execute(db.buildUpdate('Users', userUpdate, { ID: userId }));
  
  // Update employee record
  const empUpdate = {};
  if (title) empUpdate.Title = title;
  if (department) empUpdate.Title = department;
  
  if (Object.keys(empUpdate).length > 0) {
    await db.execute(db.buildUpdate('Employees', empUpdate, { UserID: userId }));
  }
  
  // Update role if provided
  if (role) {
    const roleRecord = await db.query(`SELECT ID FROM Roles WHERE Name = ${db.escapeSQL(role)}`);
    if (roleRecord && roleRecord.length > 0) {
      await db.execute(`DELETE FROM UserRoles WHERE UserID = ${db.escapeSQL(userId)}`);
      await db.execute(db.buildInsert('UserRoles', {
        UserID: userId,
        RoleID: roleRecord[0].ID
      }));
    }
  }
  
  // Fetch updated employee
  const updated = await db.query(`
    SELECT e.UserID as user_id, e.Title as title, e.IsActive as is_active,
           u.Email as email, u.FullName as full_name, u.Phone as phone, r.Name as role
    FROM Employees e
    INNER JOIN Users u ON e.UserID = u.ID
    LEFT JOIN UserRoles ur ON u.ID = ur.UserID
    LEFT JOIN Roles r ON ur.RoleID = r.ID
    WHERE e.UserID = ${db.escapeSQL(userId)}
  `);
  
  ok(res, updated[0]);
}));

// ============================================
// PATCH /api/employees/:userId/status - Manager: Update status
// ============================================

router.patch('/:userId/status', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { is_active } = req.body;
  
  const existing = await db.query(`SELECT UserID FROM Employees WHERE UserID = ${db.escapeSQL(userId)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Employee not found');
  }
  
  await db.execute(db.buildUpdate('Employees', { IsActive: is_active }, { UserID: userId }));
  
  ok(res, { user_id: userId, is_active });
}));

// ============================================
// DELETE /api/employees/:userId - Manager: Delete (soft)
// ============================================

router.delete('/:userId', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const existing = await db.query(`SELECT UserID FROM Employees WHERE UserID = ${db.escapeSQL(userId)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Employee not found');
  }
  
  // Soft delete
  await db.execute(db.buildUpdate('Employees', { IsActive: false }, { UserID: userId }));
  await db.execute(db.buildUpdate('Users', { Status: 'inactive' }, { ID: userId }));
  
  ok(res, { message: 'Employee deleted successfully' });
}));

module.exports = router;


