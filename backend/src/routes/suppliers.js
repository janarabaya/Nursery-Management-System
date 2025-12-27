/**
 * Suppliers Routes
 * 
 * GET /api/suppliers - Get all suppliers (manager)
 * POST /api/suppliers - Create supplier (manager)
 * PATCH /api/suppliers/:id - Update supplier (manager)
 * 
 * Supplier dashboard routes (for suppliers):
 * GET /api/supplier/orders - Get supplier's orders
 * GET /api/supplier/products - Get supplier's products
 * GET /api/supplier/delivery-schedule - Get delivery schedule
 * PATCH /api/supplier/orders/:id/status - Update order status
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly, supplierOnly } = require('../middleware/roles');
const { ok, created, badRequest, notFound } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createSupplierSchema = Joi.object({
  company_name: Joi.string().required(),
  contact_name: Joi.string().optional(),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().optional()
});

// ============================================
// GET /api/suppliers - Manager: Get all
// ============================================

router.get('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const suppliers = await db.query(`
    SELECT ID as id, UserID as user_id, CompanyName as company_name,
           ContactName as contact_name, Phone as phone, Email as email,
           Address as address, IsActive as is_active
    FROM Suppliers
    ORDER BY CompanyName
  `);
  
  ok(res, suppliers.map(s => ({
    ...s,
    is_active: Boolean(s.is_active)
  })));
}));

// ============================================
// POST /api/suppliers - Manager: Create
// ============================================

router.post('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { error, value } = createSupplierSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { company_name, contact_name, phone, email, address } = value;
  
  await db.execute(db.buildInsert('Suppliers', {
    CompanyName: company_name,
    ContactName: contact_name || '',
    Phone: phone || '',
    Email: email || '',
    Address: address || '',
    IsActive: true
  }));
  
  // Get created supplier
  const suppliers = await db.query(`
    SELECT TOP 1 * FROM Suppliers WHERE CompanyName = ${db.escapeSQL(company_name)}
    ORDER BY ID DESC
  `);
  
  created(res, suppliers[0]);
}));

// ============================================
// PATCH /api/suppliers/:id - Manager: Update
// ============================================

router.patch('/:id', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const existing = await db.query(`SELECT ID FROM Suppliers WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Supplier not found');
  }
  
  const updateData = {};
  if (req.body.company_name) updateData.CompanyName = req.body.company_name;
  if (req.body.contact_name !== undefined) updateData.ContactName = req.body.contact_name;
  if (req.body.phone !== undefined) updateData.Phone = req.body.phone;
  if (req.body.email !== undefined) updateData.Email = req.body.email;
  if (req.body.address !== undefined) updateData.Address = req.body.address;
  if (req.body.is_active !== undefined) updateData.IsActive = req.body.is_active;
  
  if (Object.keys(updateData).length === 0) {
    return badRequest(res, 'No fields to update');
  }
  
  await db.execute(db.buildUpdate('Suppliers', updateData, { ID: id }));
  
  const updated = await db.query(`SELECT * FROM Suppliers WHERE ID = ${db.escapeSQL(id)}`);
  ok(res, updated[0]);
}));

// ============================================
// SUPPLIER DASHBOARD ROUTES
// ============================================

// GET /api/supplier/orders - Get supplier's orders
router.get('/orders', authenticate, supplierOnly, asyncHandler(async (req, res) => {
  // Get supplier ID for current user
  const suppliers = await db.query(`
    SELECT ID FROM Suppliers WHERE UserID = ${db.escapeSQL(req.user.id)}
  `);
  
  if (!suppliers || suppliers.length === 0) {
    return ok(res, []);
  }
  
  const supplierId = suppliers[0].ID;
  
  // Get orders assigned to this supplier
  const orders = await db.query(`
    SELECT o.ID as id, o.Status as status, o.TotalAmount as total_amount,
           o.DeliveryAddress as delivery_address, o.PlacedAt as placed_at,
           u.FullName as customer_name
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.DeliveryPartnerID = ${supplierId}
    ORDER BY o.PlacedAt DESC
  `);
  
  ok(res, orders);
}));

// GET /api/supplier/products - Get supplier's products
router.get('/products', authenticate, supplierOnly, asyncHandler(async (req, res) => {
  // For now, return inventory items (in a real app, would have supplier_products table)
  const products = await db.query(`
    SELECT TOP 20 ID as id, Name as name, SKU as sku,
           QuantityOnHand as quantity, Unit as unit
    FROM InventoryItems
    ORDER BY Name
  `);
  
  ok(res, products);
}));

// GET /api/supplier/delivery-schedule
router.get('/delivery-schedule', authenticate, supplierOnly, asyncHandler(async (req, res) => {
  const suppliers = await db.query(`
    SELECT ID FROM Suppliers WHERE UserID = ${db.escapeSQL(req.user.id)}
  `);
  
  if (!suppliers || suppliers.length === 0) {
    return ok(res, []);
  }
  
  const supplierId = suppliers[0].ID;
  
  // Get pending orders for delivery
  const schedule = await db.query(`
    SELECT o.ID as id, o.DeliveryAddress as address, o.PlacedAt as order_date,
           u.FullName as customer_name, u.Phone as customer_phone
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.DeliveryPartnerID = ${supplierId}
      AND o.Status IN ('approved', 'processing', 'shipped')
    ORDER BY o.PlacedAt
  `);
  
  ok(res, schedule.map((s, i) => ({
    id: s.id,
    address: s.address,
    customerName: s.customer_name,
    customerPhone: s.customer_phone,
    scheduledDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled'
  })));
}));

// PATCH /api/supplier/orders/:id/status
router.patch('/orders/:id/status', authenticate, supplierOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const existing = await db.query(`SELECT ID FROM Orders WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Order not found');
  }
  
  await db.execute(db.buildUpdate('Orders', {
    Status: status,
    UpdatedAt: new Date()
  }, { ID: id }));
  
  ok(res, { id, status, message: 'Order status updated' });
}));

module.exports = router;


