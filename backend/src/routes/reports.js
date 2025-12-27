/**
 * Reports Routes
 * 
 * GET /api/reports/sales - Get total sales
 * GET /api/reports/sales-detailed - Get detailed sales report
 * GET /api/reports/orders-detailed - Get detailed orders report
 * GET /api/reports/customer-activity - Get customer activity report
 * GET /api/reports/top-selling - Get top selling plants
 * GET /api/reports/inventory-low - Get low inventory items
 */

const express = require('express');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly, staffOnly } = require('../middleware/roles');
const { ok, serverError } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// GET /api/reports/sales - Total sales
// ============================================

router.get('/sales', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { since } = req.query;
  
  let whereClause = '1=1';
  if (since) {
    whereClause = `PlacedAt >= #${since}#`;
  }
  
  const result = await db.query(`
    SELECT SUM(TotalAmount) as total_sales
    FROM Orders
    WHERE ${whereClause}
  `);
  
  ok(res, {
    total_sales: parseFloat(result[0]?.total_sales) || 0
  });
}));

// ============================================
// GET /api/reports/sales-detailed - Detailed sales
// ============================================

router.get('/sales-detailed', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // Default to last 30 days
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Total sales
  const totalResult = await db.query(`
    SELECT SUM(TotalAmount) as total_sales, COUNT(*) as total_orders
    FROM Orders
    WHERE PlacedAt >= #${start}# AND PlacedAt <= #${end}#
  `);
  
  // Sales by status
  const byStatus = await db.query(`
    SELECT Status, SUM(TotalAmount) as total, COUNT(*) as count
    FROM Orders
    WHERE PlacedAt >= #${start}# AND PlacedAt <= #${end}#
    GROUP BY Status
  `);
  
  // Daily sales (simplified - Access doesn't have DATE_TRUNC)
  const orders = await db.query(`
    SELECT PlacedAt, TotalAmount
    FROM Orders
    WHERE PlacedAt >= #${start}# AND PlacedAt <= #${end}#
    ORDER BY PlacedAt
  `);
  
  // Group by date manually
  const dailySalesMap = {};
  orders.forEach(o => {
    const date = new Date(o.PlacedAt).toISOString().split('T')[0];
    if (!dailySalesMap[date]) {
      dailySalesMap[date] = { date, total: 0, count: 0 };
    }
    dailySalesMap[date].total += parseFloat(o.TotalAmount) || 0;
    dailySalesMap[date].count += 1;
  });
  
  ok(res, {
    totalSales: parseFloat(totalResult[0]?.total_sales) || 0,
    totalOrders: parseInt(totalResult[0]?.total_orders) || 0,
    dailySales: Object.values(dailySalesMap),
    salesByStatus: byStatus.map(s => ({
      status: s.Status,
      total: parseFloat(s.total) || 0,
      count: parseInt(s.count) || 0
    })),
    dateRange: { start, end }
  });
}));

// ============================================
// GET /api/reports/orders-detailed - Detailed orders
// ============================================

router.get('/orders-detailed', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Get orders
  const orders = await db.query(`
    SELECT TOP 100 o.ID as id, o.Status as status, o.TotalAmount as amount,
           o.PlacedAt as date, u.FullName as customer_name, u.Email as customer_email
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.PlacedAt >= #${start}# AND o.PlacedAt <= #${end}#
    ORDER BY o.PlacedAt DESC
  `);
  
  // Orders by status
  const byStatus = await db.query(`
    SELECT Status, COUNT(*) as count
    FROM Orders
    WHERE PlacedAt >= #${start}# AND PlacedAt <= #${end}#
    GROUP BY Status
  `);
  
  // Total count
  const totalResult = await db.query(`
    SELECT COUNT(*) as total
    FROM Orders
    WHERE PlacedAt >= #${start}# AND PlacedAt <= #${end}#
  `);
  
  // Group orders by date
  const ordersByDate = {};
  orders.forEach(o => {
    const date = new Date(o.date).toISOString().split('T')[0];
    if (!ordersByDate[date]) {
      ordersByDate[date] = { date, count: 0 };
    }
    ordersByDate[date].count += 1;
  });
  
  ok(res, {
    totalOrders: parseInt(totalResult[0]?.total) || 0,
    orders: orders.map(o => ({
      id: o.id,
      orderId: `ORD-${String(o.id).padStart(3, '0')}`,
      customerName: o.customer_name || 'Unknown',
      customerEmail: o.customer_email || '',
      amount: parseFloat(o.amount) || 0,
      status: o.status,
      date: o.date
    })),
    ordersByStatus: byStatus.map(s => ({
      status: s.Status,
      count: parseInt(s.count) || 0
    })),
    ordersByDate: Object.values(ordersByDate),
    dateRange: { start, end }
  });
}));

// ============================================
// GET /api/reports/customer-activity - Customer activity
// ============================================

router.get('/customer-activity', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Top customers
  const topCustomers = await db.query(`
    SELECT TOP 10 o.CustomerID as customer_id, u.FullName as customer_name,
           u.Email as customer_email, COUNT(*) as order_count, 
           SUM(o.TotalAmount) as total_spent
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.UserID
    LEFT JOIN Users u ON c.UserID = u.ID
    WHERE o.PlacedAt >= #${start}# AND o.PlacedAt <= #${end}#
    GROUP BY o.CustomerID, u.FullName, u.Email
    ORDER BY COUNT(*) DESC
  `);
  
  // Activity by day (simplified)
  const orders = await db.query(`
    SELECT CustomerID, PlacedAt
    FROM Orders
    WHERE PlacedAt >= #${start}# AND PlacedAt <= #${end}#
  `);
  
  const activityMap = {};
  orders.forEach(o => {
    const date = new Date(o.PlacedAt).toISOString().split('T')[0];
    if (!activityMap[date]) {
      activityMap[date] = { date, uniqueCustomers: new Set(), orderCount: 0 };
    }
    activityMap[date].uniqueCustomers.add(o.CustomerID);
    activityMap[date].orderCount += 1;
  });
  
  const activityByDay = Object.values(activityMap).map(a => ({
    date: a.date,
    uniqueCustomers: a.uniqueCustomers.size,
    orderCount: a.orderCount
  }));
  
  ok(res, {
    topCustomers: topCustomers.map(c => ({
      customerId: c.customer_id,
      customerName: c.customer_name || 'Unknown',
      customerEmail: c.customer_email || '',
      orderCount: parseInt(c.order_count) || 0,
      totalSpent: parseFloat(c.total_spent) || 0
    })),
    activityByDay,
    dateRange: { start, end }
  });
}));

// ============================================
// GET /api/reports/top-selling - Top selling plants
// ============================================

router.get('/top-selling', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const topSelling = await db.query(`
    SELECT TOP 10 p.ID as plant_id, p.Name as plant_name,
           SUM(oi.Quantity) as total_sold,
           SUM(oi.Quantity * oi.UnitPrice) as total_revenue,
           COUNT(DISTINCT oi.OrderID) as order_count
    FROM OrderItems oi
    INNER JOIN Orders o ON oi.OrderID = o.ID
    INNER JOIN InventoryItems i ON oi.InventoryItemID = i.ID
    INNER JOIN Plants p ON i.PlantID = p.ID
    WHERE o.PlacedAt >= #${start}# AND o.PlacedAt <= #${end}#
      AND o.Status IN ('completed', 'approved', 'delivered')
    GROUP BY p.ID, p.Name
    ORDER BY SUM(oi.Quantity) DESC
  `);
  
  ok(res, topSelling.map(item => ({
    plant_id: item.plant_id,
    plant_name: item.plant_name || 'Unknown Plant',
    total_sold: parseInt(item.total_sold) || 0,
    total_revenue: parseFloat(item.total_revenue) || 0,
    order_count: parseInt(item.order_count) || 0
  })));
}));

// ============================================
// GET /api/reports/inventory-low - Low inventory
// ============================================

router.get('/inventory-low', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const items = await db.query(`
    SELECT i.ID as id, i.Name as name, i.SKU as sku,
           i.QuantityOnHand as quantity_on_hand, i.ReorderLevel as reorder_level,
           p.Name as plant_name
    FROM InventoryItems i
    LEFT JOIN Plants p ON i.PlantID = p.ID
    WHERE i.QuantityOnHand <= i.ReorderLevel
    ORDER BY i.QuantityOnHand ASC
  `);
  
  ok(res, items.map(i => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    quantity_on_hand: i.quantity_on_hand,
    reorder_level: i.reorder_level,
    plant_name: i.plant_name
  })));
}));

module.exports = router;


