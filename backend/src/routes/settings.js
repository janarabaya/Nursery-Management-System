/**
 * Settings Routes
 * 
 * GET /api/settings/nursery - Get nursery settings
 * PUT /api/settings/nursery - Update nursery settings
 * GET /api/settings/system - Get system settings
 * PUT /api/settings/system - Update system settings
 * GET /api/users/profile - Get user profile
 * PUT /api/users/profile - Update user profile
 * POST /api/users/change-password - Change password
 * PUT /api/users/:id/role - Update user role (admin)
 * PUT /api/users/:id/permissions - Update user permissions (admin)
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');
const { hashPassword, comparePassword } = require('../utils/hashing');
const { ok, badRequest, notFound, unauthorized } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// SETTINGS ROUTES
// ============================================

// GET /api/settings/nursery - Get nursery settings
router.get('/nursery', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const settings = await db.query(`
    SELECT SettingKey as key, SettingValue as value
    FROM Settings
    WHERE Category = 'nursery'
  `);
  
  // Convert to object
  const settingsObj = {};
  settings.forEach(s => {
    settingsObj[s.key] = s.value;
  });
  
  ok(res, {
    name: settingsObj.name || 'Plant Nursery',
    address: settingsObj.address || '',
    phone: settingsObj.phone || '',
    email: settingsObj.email || '',
    openingHours: settingsObj.openingHours || '9:00 AM - 6:00 PM',
    currency: settingsObj.currency || 'USD',
    taxRate: parseFloat(settingsObj.taxRate) || 0,
    ...settingsObj
  });
}));

// PUT /api/settings/nursery - Update nursery settings
router.put('/nursery', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { name, address, phone, email, openingHours, currency, taxRate } = req.body;
  
  const settingsToUpdate = { name, address, phone, email, openingHours, currency, taxRate };
  
  for (const [key, value] of Object.entries(settingsToUpdate)) {
    if (value !== undefined) {
      // Check if setting exists
      const existing = await db.query(`
        SELECT ID FROM Settings WHERE SettingKey = ${db.escapeSQL(key)} AND Category = 'nursery'
      `);
      
      if (existing && existing.length > 0) {
        await db.execute(db.buildUpdate('Settings', { SettingValue: String(value) }, { SettingKey: key, Category: 'nursery' }));
      } else {
        await db.execute(db.buildInsert('Settings', {
          SettingKey: key,
          SettingValue: String(value),
          Category: 'nursery'
        }));
      }
    }
  }
  
  ok(res, { message: 'Nursery settings updated', ...req.body });
}));

// GET /api/settings/system - Get system settings
router.get('/system', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const settings = await db.query(`
    SELECT SettingKey as key, SettingValue as value
    FROM Settings
    WHERE Category = 'system'
  `);
  
  const settingsObj = {};
  settings.forEach(s => {
    settingsObj[s.key] = s.value;
  });
  
  ok(res, {
    maintenanceMode: settingsObj.maintenanceMode === 'true',
    backupFrequency: settingsObj.backupFrequency || 'daily',
    sessionTimeout: parseInt(settingsObj.sessionTimeout) || 60,
    maxLoginAttempts: parseInt(settingsObj.maxLoginAttempts) || 5,
    ...settingsObj
  });
}));

// PUT /api/settings/system - Update system settings
router.put('/system', authenticate, adminOnly, asyncHandler(async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    const existing = await db.query(`
      SELECT ID FROM Settings WHERE SettingKey = ${db.escapeSQL(key)} AND Category = 'system'
    `);
    
    if (existing && existing.length > 0) {
      await db.execute(db.buildUpdate('Settings', { SettingValue: String(value) }, { SettingKey: key, Category: 'system' }));
    } else {
      await db.execute(db.buildInsert('Settings', {
        SettingKey: key,
        SettingValue: String(value),
        Category: 'system'
      }));
    }
  }
  
  ok(res, { message: 'System settings updated', ...req.body });
}));

// ============================================
// USER PROFILE ROUTES
// ============================================

// GET /api/users/profile - Get current user profile
router.get('/users/profile', authenticate, asyncHandler(async (req, res) => {
  const users = await db.query(`
    SELECT u.ID as id, u.Email as email, u.FullName as full_name,
           u.Phone as phone, u.Status as status, r.Name as role
    FROM Users u
    LEFT JOIN UserRoles ur ON u.ID = ur.UserID
    LEFT JOIN Roles r ON ur.RoleID = r.ID
    WHERE u.ID = ${db.escapeSQL(req.user.id)}
  `);
  
  if (!users || users.length === 0) {
    return notFound(res, 'User not found');
  }
  
  const user = users[0];
  
  ok(res, {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    status: user.status,
    role: user.role
  });
}));

// PUT /api/users/profile - Update current user profile
router.put('/users/profile', authenticate, asyncHandler(async (req, res) => {
  const { full_name, phone } = req.body;
  
  const updateData = {};
  if (full_name) updateData.FullName = full_name;
  if (phone !== undefined) updateData.Phone = phone;
  updateData.UpdatedAt = new Date();
  
  if (Object.keys(updateData).length === 1) { // Only UpdatedAt
    return badRequest(res, 'No fields to update');
  }
  
  await db.execute(db.buildUpdate('Users', updateData, { ID: req.user.id }));
  
  const updated = await db.query(`
    SELECT ID as id, Email as email, FullName as full_name, Phone as phone
    FROM Users WHERE ID = ${db.escapeSQL(req.user.id)}
  `);
  
  ok(res, updated[0]);
}));

// POST /api/users/change-password - Change password
router.post('/users/change-password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return badRequest(res, 'Current password and new password are required');
  }
  
  if (newPassword.length < 6) {
    return badRequest(res, 'New password must be at least 6 characters');
  }
  
  // Get current password hash
  const users = await db.query(`
    SELECT PasswordHash FROM Users WHERE ID = ${db.escapeSQL(req.user.id)}
  `);
  
  if (!users || users.length === 0) {
    return notFound(res, 'User not found');
  }
  
  // Verify current password
  const isValid = await comparePassword(currentPassword, users[0].PasswordHash);
  if (!isValid) {
    return unauthorized(res, 'Current password is incorrect');
  }
  
  // Hash new password
  const newHash = await hashPassword(newPassword);
  
  await db.execute(db.buildUpdate('Users', { 
    PasswordHash: newHash,
    UpdatedAt: new Date()
  }, { ID: req.user.id }));
  
  ok(res, { message: 'Password changed successfully' });
}));

// PUT /api/users/:id/role - Update user role (admin)
router.put('/users/:id/role', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  if (!role) {
    return badRequest(res, 'Role is required');
  }
  
  // Get role ID
  const roles = await db.query(`SELECT ID FROM Roles WHERE Name = ${db.escapeSQL(role)}`);
  if (!roles || roles.length === 0) {
    return badRequest(res, 'Invalid role');
  }
  
  // Delete existing roles
  await db.execute(`DELETE FROM UserRoles WHERE UserID = ${db.escapeSQL(id)}`);
  
  // Add new role
  await db.execute(db.buildInsert('UserRoles', {
    UserID: id,
    RoleID: roles[0].ID
  }));
  
  ok(res, { id, role, message: 'User role updated' });
}));

// PUT /api/users/:id/permissions - Update permissions (admin)
router.put('/users/:id/permissions', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  
  // For now, just return success - in a real app, would save to permissions table
  ok(res, { id, permissions, message: 'Permissions updated' });
}));

module.exports = router;


