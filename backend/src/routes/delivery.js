/**
 * Delivery Company Routes
 * 
 * GET /api/delivery/orders - Get delivery orders
 * GET /api/delivery/schedule - Get delivery schedule
 * GET /api/delivery/messages - Get delivery messages
 * POST /api/delivery/messages/:id/reply - Reply to message
 * GET /api/delivery/history - Get delivery history
 * PATCH /api/delivery/orders/:id/status - Update delivery status
 * POST /api/delivery/orders/:id/proof - Upload delivery proof
 * GET /api/delivery/profile - Get company profile
 */

const express = require('express');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { deliveryOnly } = require('../middleware/roles');
const { ok, created, badRequest, notFound } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// GET /api/delivery/orders - Get delivery orders
// ============================================

router.get('/orders', authenticate, deliveryOnly, asyncHandler(async (req, res) => {
  // Get orders assigned for delivery
  const orders = await db.query(`
    SELECT o.ID as id, o.Status as status, o.TotalAmount as total_amount,
           o.DeliveryAddress as delivery_address, o.PlacedAt as placed_at,
           o.UpdatedAt as updated_at, u.FullName as customer_name,
           u.Phone as customer_phone, u.Email as customer_email
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.Status IN ('approved', 'processing', 'shipped')
    ORDER BY o.PlacedAt DESC
  `);
  
  const formattedOrders = orders.map(o => ({
    id: o.id,
    orderId: `ORD-${String(o.id).padStart(3, '0')}`,
    status: o.status,
    totalAmount: parseFloat(o.total_amount) || 0,
    deliveryAddress: o.delivery_address,
    placedAt: o.placed_at,
    customer: {
      name: o.customer_name || 'Unknown',
      phone: o.customer_phone || '',
      email: o.customer_email || ''
    }
  }));
  
  ok(res, formattedOrders);
}));

// ============================================
// GET /api/delivery/schedule - Get schedule
// ============================================

router.get('/schedule', authenticate, deliveryOnly, asyncHandler(async (req, res) => {
  const orders = await db.query(`
    SELECT o.ID as id, o.DeliveryAddress as address, o.PlacedAt as order_date,
           u.FullName as customer_name, u.Phone as customer_phone
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.Status IN ('approved', 'processing', 'shipped')
    ORDER BY o.PlacedAt
  `);
  
  const schedule = orders.map((o, i) => ({
    id: o.id,
    orderId: `ORD-${String(o.id).padStart(3, '0')}`,
    address: o.address,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    scheduledTime: new Date(Date.now() + (i + 1) * 2 * 60 * 60 * 1000).toISOString(), // Schedule every 2 hours
    status: 'scheduled',
    priority: i === 0 ? 'high' : 'normal'
  }));
  
  ok(res, schedule);
}));

// ============================================
// GET /api/delivery/messages - Get messages
// ============================================

router.get('/messages', authenticate, deliveryOnly, asyncHandler(async (req, res) => {
  // Get notifications for delivery company (simulated messages)
  const notifications = await db.query(`
    SELECT ID as id, Title as title, Body as body, IsRead as is_read,
           CreatedAt as created_at
    FROM Notifications
    WHERE UserID = ${db.escapeSQL(req.user.id)}
    ORDER BY CreatedAt DESC
  `);
  
  const messages = notifications.map(n => ({
    id: n.id,
    title: n.title,
    body: n.body,
    isRead: Boolean(n.is_read),
    createdAt: n.created_at,
    type: 'system'
  }));
  
  ok(res, messages);
}));

// ============================================
// POST /api/delivery/messages/:id/reply - Reply to message
// ============================================

router.post('/messages/:id/reply', authenticate, deliveryOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  
  if (!reply) {
    return badRequest(res, 'Reply message is required');
  }
  
  // Mark original as read
  await db.execute(db.buildUpdate('Notifications', { IsRead: true }, { ID: id }));
  
  // Create reply notification (to admin)
  await db.execute(db.buildInsert('Notifications', {
    UserID: req.user.id,
    Channel: 'reply',
    Title: 'Reply sent',
    Body: reply,
    IsRead: false,
    CreatedAt: new Date()
  }));
  
  ok(res, { message: 'Reply sent successfully' });
}));

// ============================================
// GET /api/delivery/history - Get delivery history
// ============================================

router.get('/history', authenticate, deliveryOnly, asyncHandler(async (req, res) => {
  const orders = await db.query(`
    SELECT o.ID as id, o.Status as status, o.TotalAmount as total_amount,
           o.DeliveryAddress as delivery_address, o.UpdatedAt as delivered_at,
           u.FullName as customer_name
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.Status = 'delivered'
    ORDER BY o.UpdatedAt DESC
  `);
  
  const history = orders.map(o => ({
    id: o.id,
    orderId: `ORD-${String(o.id).padStart(3, '0')}`,
    status: 'delivered',
    totalAmount: parseFloat(o.total_amount) || 0,
    deliveryAddress: o.delivery_address,
    customerName: o.customer_name,
    deliveredAt: o.delivered_at
  }));
  
  ok(res, history);
}));

// ============================================
// PATCH /api/delivery/orders/:id/status - Update status
// ============================================

router.patch('/orders/:id/status', authenticate, deliveryOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return badRequest(res, 'Status is required');
  }
  
  const existing = await db.query(`SELECT ID FROM Orders WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Order not found');
  }
  
  await db.execute(db.buildUpdate('Orders', {
    Status: status,
    UpdatedAt: new Date()
  }, { ID: id }));
  
  ok(res, { id, status, message: 'Delivery status updated' });
}));

// ============================================
// POST /api/delivery/orders/:id/proof - Upload proof
// ============================================

router.post('/orders/:id/proof', authenticate, deliveryOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { proofUrl, signature, notes } = req.body;
  
  const existing = await db.query(`SELECT ID FROM Orders WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Order not found');
  }
  
  // Update order status to delivered and add proof info to notes
  const proofInfo = `Delivery proof: ${proofUrl || 'Confirmed'}, Signature: ${signature || 'Received'}, Notes: ${notes || 'None'}`;
  
  await db.execute(db.buildUpdate('Orders', {
    Status: 'delivered',
    Notes: proofInfo,
    UpdatedAt: new Date()
  }, { ID: id }));
  
  ok(res, { 
    id, 
    status: 'delivered',
    proofUrl: proofUrl || `proof-${id}.jpg`,
    message: 'Delivery proof uploaded successfully' 
  });
}));

// ============================================
// GET /api/delivery/profile - Get profile
// ============================================

router.get('/profile', authenticate, deliveryOnly, asyncHandler(async (req, res) => {
  const users = await db.query(`
    SELECT ID as id, Email as email, FullName as full_name, Phone as phone
    FROM Users
    WHERE ID = ${db.escapeSQL(req.user.id)}
  `);
  
  if (!users || users.length === 0) {
    return notFound(res, 'Profile not found');
  }
  
  const user = users[0];
  
  // Get delivery stats
  const stats = await db.query(`
    SELECT COUNT(*) as total_deliveries
    FROM Orders
    WHERE Status = 'delivered'
  `);
  
  ok(res, {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    companyType: 'delivery_company',
    stats: {
      totalDeliveries: parseInt(stats[0]?.total_deliveries) || 0
    }
  });
}));

module.exports = router;


