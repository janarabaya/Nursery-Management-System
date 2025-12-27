/**
 * Notifications Routes
 * 
 * GET /api/notifications - Get user notifications
 * POST /api/notifications - Create notification
 * PATCH /api/notifications/:id/read - Mark as read
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { ok, created, badRequest, notFound } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createNotificationSchema = Joi.object({
  channel: Joi.string().optional(),
  title: Joi.string().required(),
  body: Joi.string().required(),
  user_id: Joi.string().optional() // If admin wants to send to specific user
});

// ============================================
// GET /api/notifications - Get user notifications
// ============================================

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const notifications = await db.query(`
    SELECT ID as id, Channel as channel, Title as title, Body as body,
           IsRead as is_read, CreatedAt as created_at
    FROM Notifications
    WHERE UserID = ${db.escapeSQL(userId)}
    ORDER BY CreatedAt DESC
  `);
  
  const formattedNotifications = notifications.map(n => ({
    id: n.id,
    channel: n.channel,
    title: n.title,
    body: n.body,
    is_read: Boolean(n.is_read),
    created_at: n.created_at
  }));
  
  ok(res, formattedNotifications);
}));

// ============================================
// POST /api/notifications - Create notification
// ============================================

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { error, value } = createNotificationSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { channel, title, body, user_id } = value;
  
  // If user_id provided (admin sending to specific user), use it
  // Otherwise, create for current user
  const targetUserId = user_id || req.user.id;
  
  await db.execute(db.buildInsert('Notifications', {
    UserID: targetUserId,
    Channel: channel || 'general',
    Title: title,
    Body: body,
    IsRead: false,
    CreatedAt: new Date()
  }));
  
  // Get created notification
  const notifications = await db.query(`
    SELECT TOP 1 ID as id, Channel as channel, Title as title, Body as body,
           IsRead as is_read, CreatedAt as created_at
    FROM Notifications
    WHERE UserID = ${db.escapeSQL(targetUserId)}
    ORDER BY ID DESC
  `);
  
  created(res, notifications[0]);
}));

// ============================================
// PATCH /api/notifications/:id/read - Mark as read
// ============================================

router.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const existing = await db.query(`
    SELECT ID FROM Notifications 
    WHERE ID = ${db.escapeSQL(id)} AND UserID = ${db.escapeSQL(req.user.id)}
  `);
  
  if (!existing || existing.length === 0) {
    return notFound(res, 'Notification not found');
  }
  
  await db.execute(db.buildUpdate('Notifications', { IsRead: true }, { ID: id }));
  
  ok(res, { id, is_read: true });
}));

// ============================================
// PATCH /api/notifications/read-all - Mark all as read
// ============================================

router.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  await db.execute(`
    UPDATE Notifications SET IsRead = TRUE
    WHERE UserID = ${db.escapeSQL(req.user.id)}
  `);
  
  ok(res, { message: 'All notifications marked as read' });
}));

module.exports = router;


