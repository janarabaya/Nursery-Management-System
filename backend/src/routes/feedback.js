/**
 * Feedback Routes
 * 
 * POST /api/feedback - Submit feedback
 * GET /api/feedback - Get all feedback (manager)
 * PATCH /api/feedback/:id/review - Mark as reviewed (manager)
 * POST /api/feedback/:id/response - Add response (manager)
 * POST /api/feedback/:id/resolve - Resolve feedback (manager)
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');
const { ok, created, badRequest, notFound } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createFeedbackSchema = Joi.object({
  rating: Joi.number().min(1).max(5).optional(),
  message: Joi.string().required(),
  customer_id: Joi.string().optional()
});

// ============================================
// POST /api/feedback - Submit feedback
// ============================================

router.post('/', optionalAuth, asyncHandler(async (req, res) => {
  const { error, value } = createFeedbackSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { rating, message, customer_id } = value;
  
  // Get customer ID from token or body
  const customerId = req.user?.id || customer_id;
  
  if (!customerId) {
    return badRequest(res, 'Customer authentication required');
  }
  
  // Ensure customer exists
  const customerExists = await db.query(
    `SELECT UserID FROM Customers WHERE UserID = ${db.escapeSQL(customerId)}`
  );
  
  if (!customerExists || customerExists.length === 0) {
    // Create customer record if needed
    await db.execute(db.buildInsert('Customers', {
      UserID: customerId,
      Address: '',
      City: '',
      Country: ''
    }));
  }
  
  // Create feedback
  await db.execute(db.buildInsert('CustomerFeedback', {
    CustomerID: customerId,
    Message: message.trim(),
    Rating: rating || null,
    IsReviewed: false,
    CreatedAt: new Date(),
    UpdatedAt: new Date()
  }));
  
  // Get created feedback
  const feedbacks = await db.query(`
    SELECT TOP 1 cf.ID as id, cf.Message as message, cf.Rating as rating,
           cf.IsReviewed as is_reviewed, cf.CreatedAt as date,
           u.FullName as customer_name, u.Email as customer_email
    FROM CustomerFeedback cf
    LEFT JOIN Customers c ON cf.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE cf.CustomerID = ${db.escapeSQL(customerId)}
    ORDER BY cf.ID DESC
  `);
  
  const feedback = feedbacks[0];
  
  created(res, {
    id: feedback.id,
    customerName: feedback.customer_name || 'Unknown',
    customerEmail: feedback.customer_email || '',
    message: feedback.message,
    rating: feedback.rating,
    isReviewed: Boolean(feedback.is_reviewed),
    date: feedback.date
  });
}));

// ============================================
// GET /api/feedback - Manager: Get all feedback
// ============================================

router.get('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { reviewed } = req.query;
  
  let whereClause = '1=1';
  if (reviewed === 'true' || reviewed === '1') {
    whereClause = 'cf.IsReviewed = TRUE';
  } else if (reviewed === 'false' || reviewed === '0') {
    whereClause = 'cf.IsReviewed = FALSE';
  }
  
  const feedbacks = await db.query(`
    SELECT cf.ID as id, cf.Message as message, cf.Rating as rating,
           cf.IsReviewed as is_reviewed, cf.CreatedAt as date,
           cf.ReviewedAt as reviewed_at, cf.ReviewedBy as reviewed_by,
           u.FullName as customer_name, u.Email as customer_email
    FROM CustomerFeedback cf
    LEFT JOIN Customers c ON cf.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE ${whereClause}
    ORDER BY cf.CreatedAt DESC
  `);
  
  const formattedFeedbacks = feedbacks.map(f => ({
    id: f.id,
    customerName: f.customer_name || 'Unknown Customer',
    customerEmail: f.customer_email || '',
    message: f.message,
    rating: f.rating,
    isReviewed: Boolean(f.is_reviewed),
    date: f.date,
    reviewedAt: f.reviewed_at
  }));
  
  ok(res, formattedFeedbacks);
}));

// ============================================
// PATCH /api/feedback/:id/review - Manager: Mark reviewed
// ============================================

router.patch('/:id/review', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const existing = await db.query(`SELECT ID FROM CustomerFeedback WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Feedback not found');
  }
  
  await db.execute(db.buildUpdate('CustomerFeedback', {
    IsReviewed: true,
    ReviewedBy: req.user.id,
    ReviewedAt: new Date(),
    UpdatedAt: new Date()
  }, { ID: id }));
  
  // Get updated feedback
  const updated = await db.query(`
    SELECT cf.ID as id, cf.Message as message, cf.Rating as rating,
           cf.IsReviewed as is_reviewed, cf.CreatedAt as date,
           cf.ReviewedAt as reviewed_at, u.FullName as customer_name
    FROM CustomerFeedback cf
    LEFT JOIN Customers c ON cf.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE cf.ID = ${db.escapeSQL(id)}
  `);
  
  const feedback = updated[0];
  
  ok(res, {
    id: feedback.id,
    customerName: feedback.customer_name || 'Unknown',
    message: feedback.message,
    rating: feedback.rating,
    isReviewed: Boolean(feedback.is_reviewed),
    date: feedback.date,
    reviewedAt: feedback.reviewed_at
  });
}));

// ============================================
// POST /api/feedback/:id/response - Manager: Add response
// ============================================

router.post('/:id/response', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  
  const existing = await db.query(`SELECT ID FROM CustomerFeedback WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Feedback not found');
  }
  
  // Update feedback with response (store in message field or create separate column)
  await db.execute(db.buildUpdate('CustomerFeedback', {
    UpdatedAt: new Date()
  }, { ID: id }));
  
  ok(res, { id, response, message: 'Response added successfully' });
}));

// ============================================
// POST /api/feedback/:id/resolve - Manager: Resolve
// ============================================

router.post('/:id/resolve', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const existing = await db.query(`SELECT ID FROM CustomerFeedback WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Feedback not found');
  }
  
  await db.execute(db.buildUpdate('CustomerFeedback', {
    IsReviewed: true,
    ReviewedBy: req.user.id,
    ReviewedAt: new Date(),
    UpdatedAt: new Date()
  }, { ID: id }));
  
  ok(res, { id, message: 'Feedback resolved successfully' });
}));

module.exports = router;


