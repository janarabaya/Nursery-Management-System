/**
 * Reports Routes
 * 
 * GET /api/reports/sales - Get total sales
 * GET /api/reports/sales-detailed - Get detailed sales report
 * GET /api/reports/orders-detailed - Get detailed orders report
 * GET /api/reports/customer-activity - Get customer activity report
 * GET /api/reports/top-selling - Get top selling plants
 * GET /api/reports/inventory-low - Get low inventory items
 * 
 * Agricultural Engineer Reports:
 * GET /api/reports/plant-health - Plant health summary report
 * GET /api/reports/frequent-issues - Most frequent health issues
 * GET /api/reports/urgent-actions - Plants requiring urgent action
 */

const express = require('express');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly, staffOnly, managerOrEngineer, engineerOnly } = require('../middleware/roles');
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

// ============================================
// AGRICULTURAL ENGINEER REPORTS
// ============================================

// GET /api/reports/plant-health - Plant health summary report
router.get('/plant-health', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Get all health logs in date range
  const healthLogs = await db.query(`
    SELECT phl.PlantID as plant_id, p.Name as plant_name,
           COUNT(*) as inspection_count,
           SUM(IIF(phl.DiseaseDetected IS NOT NULL AND phl.DiseaseDetected <> '', 1, 0)) as disease_count
    FROM PlantHealthLogs phl
    LEFT JOIN Plants p ON phl.PlantID = p.ID
    WHERE phl.LoggedAt >= #${start}# AND phl.LoggedAt <= #${end}#
    GROUP BY phl.PlantID, p.Name
    ORDER BY inspection_count DESC
  `);
  
  // Get health status summary
  const statusSummary = await db.query(`
    SELECT COUNT(DISTINCT phl.PlantID) as total_plants_inspected,
           SUM(IIF(phl.DiseaseDetected IS NOT NULL AND phl.DiseaseDetected <> '', 1, 0)) as total_disease_incidents
    FROM PlantHealthLogs phl
    WHERE phl.LoggedAt >= #${start}# AND phl.LoggedAt <= #${end}#
  `);
  
  // Get plants with most issues
  const plantsWithIssues = healthLogs.filter(p => p.disease_count > 0);
  
  ok(res, {
    summary: {
      total_plants_inspected: parseInt(statusSummary[0]?.total_plants_inspected) || 0,
      total_disease_incidents: parseInt(statusSummary[0]?.total_disease_incidents) || 0,
      plants_with_issues: plantsWithIssues.length,
      inspection_count: healthLogs.reduce((sum, p) => sum + parseInt(p.inspection_count || 0), 0)
    },
    plant_health: healthLogs.map(p => ({
      plant_id: p.plant_id,
      plant_name: p.plant_name || 'Unknown',
      inspection_count: parseInt(p.inspection_count) || 0,
      disease_count: parseInt(p.disease_count) || 0,
      health_score: p.inspection_count > 0 
        ? Math.max(0, 100 - (p.disease_count / p.inspection_count * 100))
        : 100
    })),
    dateRange: { start, end }
  });
}));

// GET /api/reports/frequent-issues - Most frequent health issues
router.get('/frequent-issues', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { startDate, endDate, limit } = req.query;
  
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const limitCount = parseInt(limit) || 10;
  
  // Get most frequent diseases/issues
  const issues = await db.query(`
    SELECT TOP ${limitCount} phl.DiseaseDetected as issue_name,
           COUNT(*) as occurrence_count,
           COUNT(DISTINCT phl.PlantID) as affected_plants_count
    FROM PlantHealthLogs phl
    WHERE phl.LoggedAt >= #${start}# AND phl.LoggedAt <= #${end}#
      AND phl.DiseaseDetected IS NOT NULL
      AND phl.DiseaseDetected <> ''
    GROUP BY phl.DiseaseDetected
    ORDER BY COUNT(*) DESC
  `);
  
  // Get details for each issue
  const issueDetails = await Promise.all(issues.map(async (issue) => {
    const plants = await db.query(`
      SELECT DISTINCT p.ID as plant_id, p.Name as plant_name
      FROM PlantHealthLogs phl
      LEFT JOIN Plants p ON phl.PlantID = p.ID
      WHERE phl.DiseaseDetected = ${db.escapeSQL(issue.issue_name)}
        AND phl.LoggedAt >= #${start}# AND phl.LoggedAt <= #${end}#
    `);
    
    return {
      issue_name: issue.issue_name,
      occurrence_count: parseInt(issue.occurrence_count) || 0,
      affected_plants_count: parseInt(issue.affected_plants_count) || 0,
      affected_plants: plants.map(p => ({
        plant_id: p.plant_id,
        plant_name: p.plant_name || 'Unknown'
      }))
    };
  }));
  
  ok(res, {
    frequent_issues: issueDetails,
    dateRange: { start, end },
    count: issueDetails.length
  });
}));

// GET /api/reports/urgent-actions - Plants requiring urgent action
router.get('/urgent-actions', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  // Get plants with diseases that haven't been treated recently
  const urgentPlants = await db.query(`
    SELECT DISTINCT p.ID as plant_id, p.Name as plant_name,
           phl.DiseaseDetected as issue_name,
           phl.Diagnosis as symptoms,
           phl.LoggedAt as detected_date,
           phl.SprayingNotes as treatment_status
    FROM PlantHealthLogs phl
    LEFT JOIN Plants p ON phl.PlantID = p.ID
    WHERE phl.DiseaseDetected IS NOT NULL
      AND phl.DiseaseDetected <> ''
      AND (phl.SprayingNotes IS NULL OR phl.SprayingNotes = '' OR phl.SprayingNotes NOT LIKE '%Treatment%')
      AND p.IsActive = TRUE
    ORDER BY phl.LoggedAt DESC
  `);
  
  // Get plants with overdue irrigation
  const irrigationAlerts = await db.query(`
    SELECT p.ID as plant_id, p.Name as plant_name, p.CareInstructions
    FROM Plants p
    WHERE p.IsActive = TRUE 
      AND p.CareInstructions LIKE '%Irrigation Frequency%'
  `);
  
  const overdueIrrigation = [];
  for (const plant of irrigationAlerts) {
    const careInstructions = plant.CareInstructions || '';
    const freqMatch = careInstructions.match(/Irrigation Frequency:\s*(\d+)\s*days?/i);
    if (!freqMatch) continue;
    
    const frequencyDays = parseInt(freqMatch[1]);
    const lastIrrigationLog = await db.query(`
      SELECT TOP 1 LoggedAt as last_irrigation
      FROM PlantHealthLogs
      WHERE PlantID = ${db.escapeSQL(plant.plant_id)} AND IrrigationLiters IS NOT NULL
      ORDER BY LoggedAt DESC
    `);
    
    if (lastIrrigationLog && lastIrrigationLog.length > 0) {
      const lastIrrigation = new Date(lastIrrigationLog[0].last_irrigation);
      const nextIrrigation = new Date(lastIrrigation);
      nextIrrigation.setDate(nextIrrigation.getDate() + frequencyDays);
      
      if (new Date() > nextIrrigation) {
        const daysOverdue = Math.floor((new Date() - nextIrrigation) / (1000 * 60 * 60 * 24));
        overdueIrrigation.push({
          plant_id: plant.plant_id,
          plant_name: plant.plant_name,
          issue_type: 'overdue_irrigation',
          days_overdue: daysOverdue,
          priority: daysOverdue > 7 ? 'high' : daysOverdue > 3 ? 'medium' : 'low'
        });
      }
    }
  }
  
  // Combine and format
  const urgentActions = [
    ...urgentPlants.map(p => ({
      plant_id: p.plant_id,
      plant_name: p.plant_name || 'Unknown',
      issue_type: 'disease',
      issue_name: p.issue_name,
      symptoms: p.symptoms,
      detected_date: p.detected_date,
      priority: 'high'
    })),
    ...overdueIrrigation
  ];
  
  // Sort by priority (diseases first, then by days overdue)
  urgentActions.sort((a, b) => {
    if (a.issue_type === 'disease' && b.issue_type !== 'disease') return -1;
    if (a.issue_type !== 'disease' && b.issue_type === 'disease') return 1;
    if (a.days_overdue && b.days_overdue) return b.days_overdue - a.days_overdue;
    return 0;
  });
  
  ok(res, {
    urgent_actions: urgentActions,
    count: urgentActions.length,
    summary: {
      disease_issues: urgentPlants.length,
      overdue_irrigation: overdueIrrigation.length
    }
  });
}));

module.exports = router;


