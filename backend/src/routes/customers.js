/**
 * Customers Routes
 * 
 * GET /api/customers - Get all customers (manager)
 * GET /api/customers/me/orders - Get current customer's orders
 */

const express = require('express');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly, customerOnly } = require('../middleware/roles');
const { ok, notFound } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// GET /api/customers - Manager: Get all customers
// ============================================

router.get('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const customers = await db.query(`
    SELECT c.UserID as user_id, c.Address as address, c.City as city,
           c.Country as country, c.PreferredContact as preferred_contact,
           u.Email as email, u.FullName as full_name, u.Phone as phone,
           u.Status as status, u.CreatedAt as created_at
    FROM Customers c
    INNER JOIN Users u ON c.UserID = u.ID
    ORDER BY u.CreatedAt DESC
  `);
  
  const formattedCustomers = customers.map(c => ({
    user_id: c.user_id,
    address: c.address,
    city: c.city,
    country: c.country,
    preferred_contact: c.preferred_contact,
    user: {
      id: c.user_id,
      email: c.email,
      full_name: c.full_name,
      phone: c.phone,
      status: c.status
    }
  }));
  
  ok(res, formattedCustomers);
}));

// ============================================
// GET /api/customers/me/orders - Customer: Get my orders
// ============================================

router.get('/me/orders', authenticate, customerOnly, asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  
  const orders = await db.query(`
    SELECT o.ID as id, o.Status as status, o.TotalAmount as total_amount,
           o.PaymentMethod as payment_method, o.PaymentStatus as payment_status,
           o.DeliveryAddress as delivery_address, o.Notes as notes,
           o.PlacedAt as placed_at, o.UpdatedAt as updated_at
    FROM Orders o
    WHERE o.CustomerID = ${db.escapeSQL(customerId)}
    ORDER BY o.PlacedAt DESC
  `);
  
  // Get OrderProgress for each order
  const formattedOrders = await Promise.all(orders.map(async (o) => {
    let orderProgress = null;
    
    // Try to get OrderProgress from different possible column names
    const possibleColumnNames = [
      '[Order Progress]',
      'OrderProgress',
      '[OrderProgress]',
      'Order_Progress',
      '[Order_Progress]',
      'Progress',
      '[Progress]'
    ];
    
    for (const columnName of possibleColumnNames) {
      try {
        const progressResult = await db.query(`
          SELECT ${columnName} as order_progress
          FROM Orders
          WHERE ID = ${db.escapeSQL(o.id)}
        `);
        
        if (progressResult && progressResult.length > 0 && progressResult[0].order_progress) {
          orderProgress = String(progressResult[0].order_progress);
          break;
        }
      } catch (err) {
        // Try next column name
        continue;
      }
    }
    
    // If still not found, try SELECT * to find the column
    if (!orderProgress) {
      try {
        const allColumnsResult = await db.query(`
          SELECT * FROM Orders WHERE ID = ${db.escapeSQL(o.id)}
        `);
        
        if (allColumnsResult && allColumnsResult.length > 0) {
          const row = allColumnsResult[0];
          for (const key of Object.keys(row)) {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('progress') || 
                keyLower.includes('order progress') ||
                keyLower === 'orderprogress') {
              orderProgress = String(row[key] || '');
              break;
            }
          }
        }
      } catch (err) {
        // Ignore error
      }
    }
    
    return {
      id: o.id,
      status: o.status,
      total_amount: parseFloat(o.total_amount) || 0,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      delivery_address: o.delivery_address,
      notes: o.notes,
      placed_at: o.placed_at,
      updated_at: o.updated_at,
      order_progress: orderProgress || null
    };
  }));
  
  ok(res, formattedOrders);
}));

module.exports = router;


