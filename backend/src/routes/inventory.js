/**
 * Inventory Routes
 * 
 * GET /api/inventory - Get all inventory items (staff)
 * POST /api/inventory - Create inventory item (manager)
 * PATCH /api/inventory/:id - Update inventory item (staff)
 * GET /api/inventory/planning - Get planning data
 * POST /api/inventory/planning - Create/update plan
 * GET /api/inventory/receiving - Get receiving records
 * POST /api/inventory/receiving - Create receiving record
 * GET /api/inventory/orders - Get inventory orders
 * POST /api/inventory/orders - Create inventory order
 * GET /api/inventory/:id/quality - Get quality check
 * POST /api/inventory/:id/quality - Perform quality check
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly, staffOnly } = require('../middleware/roles');
const { ok, created, badRequest, notFound } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// GET /api/inventory - Staff: Get all items
// ============================================

router.get('/', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const items = await db.query(`
    SELECT i.ID as id, i.Kind as kind, i.PlantID as plant_id, i.Name as name,
           i.SKU as sku, i.Unit as unit, i.QuantityOnHand as quantity_on_hand,
           i.ReorderLevel as reorder_level, i.Location as location,
           i.CreatedAt as created_at, i.UpdatedAt as updated_at,
           p.Name as plant_name, p.ImageUrl as plant_image
    FROM InventoryItems i
    LEFT JOIN Plants p ON i.PlantID = p.ID
    ORDER BY i.ID DESC
  `);
  
  const formattedItems = items.map(i => ({
    ...i,
    isLowStock: (i.quantity_on_hand || 0) <= (i.reorder_level || 0),
    plant: i.plant_name ? { name: i.plant_name, image_url: i.plant_image } : null
  }));
  
  ok(res, formattedItems);
}));

// ============================================
// GET /api/inventory/planning - Get planning data
// ============================================

router.get('/planning', authenticate, staffOnly, asyncHandler(async (req, res) => {
  // Get items that need reordering
  const items = await db.query(`
    SELECT i.ID as id, i.Name as name, i.QuantityOnHand as quantity,
           i.ReorderLevel as reorder_level, i.SKU as sku
    FROM InventoryItems i
    WHERE i.QuantityOnHand <= i.ReorderLevel
    ORDER BY i.QuantityOnHand ASC
  `);
  
  const plans = items.map(i => ({
    id: i.id,
    itemId: i.id,
    itemName: i.name,
    currentStock: i.quantity,
    reorderLevel: i.reorder_level,
    suggestedOrder: Math.max(0, (i.reorder_level * 2) - i.quantity),
    priority: i.quantity === 0 ? 'high' : 'medium',
    status: 'pending'
  }));
  
  ok(res, plans);
}));

// ============================================
// POST /api/inventory/planning - Create/update plan
// ============================================

router.post('/planning', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const { itemId, quantity, priority, notes } = req.body;
  
  // For now, just return success - in a real app, this would save to a planning table
  created(res, {
    id: Date.now(),
    itemId,
    quantity,
    priority: priority || 'medium',
    notes,
    status: 'planned',
    createdAt: new Date()
  });
}));

// ============================================
// GET /api/inventory/receiving - Get receiving records
// ============================================

router.get('/receiving', authenticate, staffOnly, asyncHandler(async (req, res) => {
  // Return recent inventory updates as receiving records
  const items = await db.query(`
    SELECT TOP 20 i.ID as id, i.Name as name, i.QuantityOnHand as quantity,
           i.UpdatedAt as received_date, i.Location as location
    FROM InventoryItems i
    ORDER BY i.UpdatedAt DESC
  `);
  
  const records = items.map(i => ({
    id: i.id,
    itemName: i.name,
    quantity: i.quantity,
    receivedDate: i.received_date,
    location: i.location,
    status: 'received'
  }));
  
  ok(res, records);
}));

// ============================================
// POST /api/inventory/receiving - Create receiving record
// ============================================

router.post('/receiving', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const { itemId, quantity, location, notes } = req.body;
  
  if (!itemId || !quantity) {
    return badRequest(res, 'itemId and quantity are required');
  }
  
  // Update inventory quantity
  await db.execute(`
    UPDATE InventoryItems
    SET QuantityOnHand = QuantityOnHand + ${parseInt(quantity)},
        Location = ${db.escapeSQL(location || '')},
        UpdatedAt = Now()
    WHERE ID = ${db.escapeSQL(itemId)}
  `);
  
  created(res, {
    id: Date.now(),
    itemId,
    quantity,
    location,
    notes,
    receivedAt: new Date(),
    status: 'received'
  });
}));

// ============================================
// GET /api/inventory/orders - Get inventory orders
// ============================================

router.get('/orders', authenticate, staffOnly, asyncHandler(async (req, res) => {
  // Return pending/recent orders that affect inventory
  const orders = await db.query(`
    SELECT TOP 20 o.ID as id, o.Status as status, o.TotalAmount as total,
           o.PlacedAt as order_date, u.FullName as customer_name
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.Status IN ('pending', 'approved', 'processing')
    ORDER BY o.PlacedAt DESC
  `);
  
  ok(res, orders);
}));

// ============================================
// POST /api/inventory/orders - Create inventory order
// ============================================

router.post('/orders', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { items, supplierId, priority, notes } = req.body;
  
  // This would create a purchase order to a supplier
  created(res, {
    id: Date.now(),
    items,
    supplierId,
    priority: priority || 'medium',
    notes,
    status: 'pending',
    createdAt: new Date()
  });
}));

// ============================================
// POST /api/inventory - Manager: Create item
// ============================================

router.post('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { plant_id, name, sku, unit, quantity_on_hand, reorder_level, location, kind } = req.body;
  
  if (!name) {
    return badRequest(res, 'Name is required');
  }
  
  const itemSku = sku || `INV-${Date.now()}`;
  
  await db.execute(db.buildInsert('InventoryItems', {
    Kind: kind || 'plant',
    PlantID: plant_id || null,
    Name: name,
    SKU: itemSku,
    Unit: unit || 'unit',
    QuantityOnHand: quantity_on_hand || 0,
    ReorderLevel: reorder_level || 10,
    Location: location || '',
    CreatedAt: new Date(),
    UpdatedAt: new Date()
  }));
  
  const newItems = await db.query(`
    SELECT * FROM InventoryItems WHERE SKU = ${db.escapeSQL(itemSku)}
  `);
  
  created(res, newItems[0]);
}));

// ============================================
// PATCH /api/inventory/:id - Staff: Update item
// ============================================

router.patch('/:id', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity_on_hand, reorder_level, location, name } = req.body;
  
  const existing = await db.query(`SELECT ID FROM InventoryItems WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Inventory item not found');
  }
  
  const updateData = { UpdatedAt: new Date() };
  if (quantity_on_hand !== undefined) updateData.QuantityOnHand = quantity_on_hand;
  if (reorder_level !== undefined) updateData.ReorderLevel = reorder_level;
  if (location !== undefined) updateData.Location = location;
  if (name !== undefined) updateData.Name = name;
  
  await db.execute(db.buildUpdate('InventoryItems', updateData, { ID: id }));
  
  const updated = await db.query(`SELECT * FROM InventoryItems WHERE ID = ${db.escapeSQL(id)}`);
  
  ok(res, updated[0]);
}));

// ============================================
// GET /api/inventory/:id/quality - Get quality check
// ============================================

router.get('/:id/quality', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const item = await db.query(`
    SELECT ID as id, Name as name, QuantityOnHand as quantity,
           Location as location, UpdatedAt as last_check
    FROM InventoryItems WHERE ID = ${db.escapeSQL(id)}
  `);
  
  if (!item || item.length === 0) {
    return notFound(res, 'Item not found');
  }
  
  ok(res, {
    itemId: id,
    itemName: item[0].name,
    lastCheck: item[0].last_check,
    status: 'good',
    notes: ''
  });
}));

// ============================================
// POST /api/inventory/:id/quality - Perform quality check
// ============================================

router.post('/:id/quality', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes, passed } = req.body;
  
  // Update the item's updated timestamp as a record of quality check
  await db.execute(db.buildUpdate('InventoryItems', { 
    UpdatedAt: new Date() 
  }, { ID: id }));
  
  created(res, {
    itemId: id,
    status: status || (passed ? 'passed' : 'failed'),
    notes,
    checkedAt: new Date(),
    checkedBy: req.user.id
  });
}));

module.exports = router;


