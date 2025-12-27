/**
 * Orders Routes
 * 
 * GET /api/orders - Get all orders (staff)
 * GET /api/orders/:id - Get single order (staff)
 * POST /api/orders - Create order (customer)
 * PATCH /api/orders/:id/status - Update order status (staff)
 * GET /api/orders/large - Get large orders for approval (manager)
 * POST /api/orders/:id/resolve - Resolve order issues (manager)
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly, staffOnly, customerOnly } = require('../middleware/roles');
const { ok, created, badRequest, notFound, serverError } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createOrderSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    inventory_item_id: Joi.number().required(),
    quantity: Joi.number().integer().min(1).required()
  })).min(1).required(),
  delivery_address: Joi.string().required(),
  notes: Joi.string().allow('', null).optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled').required()
});

// ============================================
// GET /api/orders - Staff: Get all orders
// ============================================

router.get('/', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  let whereClause = '1=1';
  if (status) {
    whereClause = `o.Status = ${db.escapeSQL(status)}`;
  }
  
  const orders = await db.query(`
    SELECT o.ID as id, o.CustomerID as customer_id, o.Status as status,
           o.TotalAmount as total_amount, o.PaymentMethod as payment_method,
           o.PaymentStatus as payment_status, o.DeliveryAddress as delivery_address,
           o.Notes as notes, o.PlacedAt as placed_at, o.UpdatedAt as updated_at,
           u.FullName as customer_name, u.Email as customer_email, u.Phone as customer_phone
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE ${whereClause}
    ORDER BY o.PlacedAt DESC
  `);
  
  // Format orders with nested customer info
  const formattedOrders = orders.map(o => ({
    id: o.id,
    customer_id: o.customer_id,
    status: o.status,
    total_amount: parseFloat(o.total_amount) || 0,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    delivery_address: o.delivery_address,
    notes: o.notes,
    placed_at: o.placed_at,
    updated_at: o.updated_at,
    customer: {
      user: {
        full_name: o.customer_name || 'Unknown',
        email: o.customer_email || '',
        phone: o.customer_phone || ''
      }
    }
  }));
  
  ok(res, formattedOrders);
}));

// ============================================
// GET /api/orders/large - Manager: Get large orders
// ============================================

router.get('/large', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const threshold = parseFloat(req.query.threshold) || 5000;
  
  const orders = await db.query(`
    SELECT o.ID as id, o.TotalAmount as total_amount, o.Status as status,
           o.PlacedAt as placed_at, u.FullName as customer_name
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.Status = 'pending' AND o.TotalAmount >= ${threshold}
    ORDER BY o.PlacedAt DESC
  `);
  
  const formattedOrders = orders.map(o => ({
    id: o.id,
    orderId: `ORD-${String(o.id).padStart(3, '0')}`,
    customerName: o.customer_name || 'Unknown Customer',
    amount: parseFloat(o.total_amount) || 0,
    date: o.placed_at,
    status: o.status
  }));
  
  ok(res, formattedOrders);
}));

// ============================================
// GET /api/orders/:id - Staff: Get single order
// ============================================

router.get('/:id', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const orders = await db.query(`
    SELECT o.ID as id, o.CustomerID as customer_id, o.Status as status,
           o.TotalAmount as total_amount, o.PaymentMethod as payment_method,
           o.PaymentStatus as payment_status, o.DeliveryAddress as delivery_address,
           o.Notes as notes, o.PlacedAt as placed_at, o.UpdatedAt as updated_at,
           u.FullName as customer_name, u.Email as customer_email, u.Phone as customer_phone
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.ID = ${db.escapeSQL(id)}
  `);
  
  if (!orders || orders.length === 0) {
    return notFound(res, 'Order not found');
  }
  
  const order = orders[0];
  
  // Get order items
  const items = await db.query(`
    SELECT oi.ID as id, oi.Quantity as quantity, oi.UnitPrice as unit_price,
           i.ID as inventory_item_id, i.Name as item_name,
           p.Name as plant_name, p.ImageUrl as plant_image
    FROM OrderItems oi
    LEFT JOIN InventoryItems i ON oi.InventoryItemID = i.ID
    LEFT JOIN Plants p ON i.PlantID = p.ID
    WHERE oi.OrderID = ${db.escapeSQL(id)}
  `);
  
  const formattedItems = items.map(i => ({
    id: i.id,
    quantity: i.quantity,
    unit_price: parseFloat(i.unit_price) || 0,
    inventory_item: {
      id: i.inventory_item_id,
      name: i.item_name,
      plant: {
        name: i.plant_name,
        image_url: i.plant_image
      }
    }
  }));
  
  ok(res, {
    id: order.id,
    customer_id: order.customer_id,
    status: order.status,
    total_amount: parseFloat(order.total_amount) || 0,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    delivery_address: order.delivery_address,
    notes: order.notes,
    placed_at: order.placed_at,
    updated_at: order.updated_at,
    customer: {
      user: {
        full_name: order.customer_name || 'Unknown',
        email: order.customer_email || '',
        phone: order.customer_phone || ''
      }
    },
    order_items: formattedItems
  });
}));

// ============================================
// POST /api/orders - Customer: Create order
// ============================================

router.post('/', authenticate, customerOnly, asyncHandler(async (req, res) => {
  const { error, value } = createOrderSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { items, delivery_address, notes } = value;
  const customerId = req.user.id;
  
  // Calculate total amount
  let totalAmount = 0;
  const itemDetails = [];
  
  for (const item of items) {
    const inventoryItems = await db.query(`
      SELECT ID, QuantityOnHand, BasePrice
      FROM InventoryItems
      WHERE ID = ${item.inventory_item_id}
    `);
    
    if (!inventoryItems || inventoryItems.length === 0) {
      return badRequest(res, `Inventory item ${item.inventory_item_id} not found`);
    }
    
    const invItem = inventoryItems[0];
    
    if (invItem.QuantityOnHand < item.quantity) {
      return badRequest(res, `Insufficient stock for item ${item.inventory_item_id}`);
    }
    
    const unitPrice = parseFloat(invItem.BasePrice) || 0;
    totalAmount += unitPrice * item.quantity;
    
    itemDetails.push({
      inventory_item_id: item.inventory_item_id,
      quantity: item.quantity,
      unit_price: unitPrice
    });
  }
  
  // Create order
  await db.execute(db.buildInsert('Orders', {
    CustomerID: customerId,
    Status: 'pending',
    TotalAmount: totalAmount,
    PaymentMethod: 'cash',
    PaymentStatus: 'pending',
    DeliveryAddress: delivery_address,
    Notes: notes || '',
    PlacedAt: new Date(),
    UpdatedAt: new Date()
  }));
  
  // Get the created order ID
  const newOrders = await db.query(`
    SELECT TOP 1 ID FROM Orders WHERE CustomerID = ${db.escapeSQL(customerId)}
    ORDER BY ID DESC
  `);
  
  const orderId = newOrders[0].ID;
  
  // Create order items and update inventory
  for (const item of itemDetails) {
    await db.execute(db.buildInsert('OrderItems', {
      OrderID: orderId,
      InventoryItemID: item.inventory_item_id,
      Quantity: item.quantity,
      UnitPrice: item.unit_price
    }));
    
    // Reduce inventory
    await db.execute(`
      UPDATE InventoryItems 
      SET QuantityOnHand = QuantityOnHand - ${item.quantity}
      WHERE ID = ${item.inventory_item_id}
    `);
  }
  
  created(res, {
    id: orderId,
    customer_id: customerId,
    status: 'pending',
    total_amount: totalAmount,
    delivery_address: delivery_address,
    message: 'Order created successfully'
  });
}));

// ============================================
// PATCH /api/orders/:id/status - Staff: Update status
// ============================================

router.patch('/:id/status', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { error, value } = updateStatusSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { status } = value;
  
  // Check if order exists
  const existing = await db.query(`SELECT ID FROM Orders WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Order not found');
  }
  
  await db.execute(db.buildUpdate('Orders', { 
    Status: status,
    UpdatedAt: new Date() 
  }, { ID: id }));
  
  // Fetch updated order
  const updated = await db.query(`
    SELECT ID as id, CustomerID as customer_id, Status as status,
           TotalAmount as total_amount, PlacedAt as placed_at
    FROM Orders WHERE ID = ${db.escapeSQL(id)}
  `);
  
  ok(res, updated[0]);
}));

// ============================================
// POST /api/orders/:id/resolve - Manager: Resolve issues
// ============================================

router.post('/:id/resolve', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resolution } = req.body;
  
  // Check if order exists
  const existing = await db.query(`SELECT ID FROM Orders WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Order not found');
  }
  
  // Update order notes with resolution
  await db.execute(db.buildUpdate('Orders', {
    Notes: resolution || 'Issue resolved by manager',
    UpdatedAt: new Date()
  }, { ID: id }));
  
  ok(res, { message: 'Order issue resolved', id });
}));

module.exports = router;


