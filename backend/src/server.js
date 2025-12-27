/**
 * Express Server
 * Plant Nursery Backend API
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { query, dbPath } from './database.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (images)
app.use('/images', express.static(path.join(__dirname, '../public/images')));
console.log('📷 Static images folder:', path.join(__dirname, '../public/images'));

// Test route - Get all plants
app.get('/api/test', async (req, res) => {
  try {
    const plants = await query('SELECT * FROM Plants');
    res.json({
      success: true,
      count: plants.length,
      data: plants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List tables in database using ODBC catalog function
app.get('/api/tables', async (req, res) => {
  try {
    const { dbPath } = await import('./database.js');
    const odbc = await import('odbc');
    const connectionString = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${dbPath};`;
    const conn = await odbc.default.connect(connectionString);
    const tables = await conn.tables(null, null, null, 'TABLE');
    await conn.close();
    res.json({
      success: true,
      tables: tables.map(t => t.TABLE_NAME)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: dbPath,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// /api/db/* endpoints for frontend compatibility
// ============================================

// Get database info (table names)
app.get('/api/db/info', async (req, res) => {
  try {
    const odbc = await import('odbc');
    const connectionString = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${dbPath};`;
    const conn = await odbc.default.connect(connectionString);
    const tables = await conn.tables(null, null, null, 'TABLE');
    await conn.close();
    res.json({
      success: true,
      tables: tables.map(t => t.TABLE_NAME),
      count: tables.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all data from a table
app.get('/api/db/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    // Sanitize table name to prevent SQL injection
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const data = await query(`SELECT * FROM [${sanitizedTableName}]`);
    res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update data in a table
app.put('/api/db/table/:tableName/update', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { where, data } = req.body;
    
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (!where || !data) {
      return res.status(400).json({ success: false, message: 'Missing where or data' });
    }
    
    // Map frontend field names to Access database field names for Plants table
    const fieldMapping = {
      'ID': 'PlantID',
      'Name': 'PlantName',
      'Type': 'Category',
      'Available': 'Status',
      'ImageURL': 'Picture'
    };
    
    // Fields to skip (Attachment fields in Access cannot be updated via SQL)
    const skipFields = ['Picture', 'ImageURL', 'Image', 'Attachment'];
    
    // Build SET clause
    const updates = [];
    for (const [key, value] of Object.entries(data)) {
      const dbField = fieldMapping[key] || key;
      
      // Skip attachment/image fields - they cause errors in Access
      if (skipFields.includes(key) || skipFields.includes(dbField)) {
        console.log(`⏭️ Skipping field ${key} (Attachment field)`);
        continue;
      }
      
      // Handle Status field (convert boolean to Available/Unavailable)
      if (key === 'Available' || dbField === 'Status') {
        const statusValue = value === true || value === 'true' ? 'Available' : 'Unavailable';
        updates.push(`${dbField}='${statusValue}'`);
      } else if (typeof value === 'string') {
        updates.push(`${dbField}='${value.replace(/'/g, "''")}'`);
      } else if (typeof value === 'number') {
        updates.push(`${dbField}=${value}`);
      } else if (typeof value === 'boolean') {
        updates.push(`${dbField}=${value ? 1 : 0}`);
      }
    }
    
    // Build WHERE clause
    const conditions = [];
    for (const [key, value] of Object.entries(where)) {
      const dbField = fieldMapping[key] || key;
      if (typeof value === 'string') {
        conditions.push(`${dbField}='${value.replace(/'/g, "''")}'`);
      } else {
        conditions.push(`${dbField}=${value}`);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    const sql = `UPDATE [${sanitizedTableName}] SET ${updates.join(', ')} WHERE ${conditions.join(' AND ')}`;
    console.log('🔄 UPDATE SQL:', sql);
    
    await query(sql);
    
    res.json({
      success: true,
      message: 'Updated successfully'
    });
  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Insert data into a table
app.post('/api/db/table/:tableName/insert', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { data } = req.body;
    
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (!data) {
      return res.status(400).json({ success: false, message: 'Missing data' });
    }
    
    // Map frontend field names to Access database field names for Plants table
    const fieldMapping = {
      'ID': 'PlantID',
      'Name': 'PlantName',
      'Type': 'Category',
      'Available': 'Status',
      'ImageURL': 'Picture'
    };
    
    // Fields to skip (Attachment fields in Access cannot be inserted via SQL)
    const skipFields = ['Picture', 'ImageURL', 'Image', 'Attachment'];
    
    const columns = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      const dbField = fieldMapping[key] || key;
      
      // Skip attachment/image fields - they cause errors in Access
      if (skipFields.includes(key) || skipFields.includes(dbField)) {
        console.log(`⏭️ Skipping field ${key} (Attachment field)`);
        continue;
      }
      
      columns.push(dbField);
      
      // Handle Status field (convert boolean to Available/Unavailable)
      if (key === 'Available' || dbField === 'Status') {
        const statusValue = value === true || value === 'true' ? 'Available' : 'Unavailable';
        values.push(`'${statusValue}'`);
      } else if (typeof value === 'string') {
        values.push(`'${value.replace(/'/g, "''")}'`);
      } else if (typeof value === 'number') {
        values.push(value);
      } else if (typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else {
        values.push(`'${String(value).replace(/'/g, "''")}'`);
      }
    }
    
    if (columns.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to insert' });
    }
    
    const sql = `INSERT INTO [${sanitizedTableName}] (${columns.join(', ')}) VALUES (${values.join(', ')})`;
    console.log('➕ INSERT SQL:', sql);
    
    await query(sql);
    
    res.json({
      success: true,
      message: 'Inserted successfully'
    });
  } catch (error) {
    console.error('❌ Insert error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete data from a table
app.delete('/api/db/table/:tableName/delete', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { where } = req.body;
    
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (!where) {
      return res.status(400).json({ success: false, message: 'Missing where clause' });
    }
    
    // Map frontend field names to Access database field names
    const fieldMapping = {
      'ID': 'PlantID',
      'Name': 'PlantName',
      'Type': 'Category',
      'Available': 'Status',
      'ImageURL': 'Picture'
    };
    
    // Build WHERE clause
    const conditions = [];
    for (const [key, value] of Object.entries(where)) {
      const dbField = fieldMapping[key] || key;
      if (typeof value === 'string') {
        conditions.push(`${dbField}='${value.replace(/'/g, "''")}'`);
      } else {
        conditions.push(`${dbField}=${value}`);
      }
    }
    
    const sql = `DELETE FROM [${sanitizedTableName}] WHERE ${conditions.join(' AND ')}`;
    console.log('🗑️ DELETE SQL:', sql);
    
    await query(sql);
    
    res.json({
      success: true,
      message: 'Deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get plants (for frontend compatibility)
app.get('/api/plants', async (req, res) => {
  try {
    const plants = await query('SELECT * FROM Plants');
    res.json({
      success: true,
      data: plants,
      count: plants.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update plant by ID
app.put('/api/plants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Picture, PlantName, Category, Price, Status, Description, Age } = req.body;
    
    // Build update query dynamically
    const updates = [];
    if (Picture !== undefined) updates.push(`Picture='${Picture.replace(/'/g, "''")}'`);
    if (PlantName !== undefined) updates.push(`PlantName='${PlantName.replace(/'/g, "''")}'`);
    if (Category !== undefined) updates.push(`Category='${Category.replace(/'/g, "''")}'`);
    if (Price !== undefined) updates.push(`Price='${Price}'`);
    if (Status !== undefined) updates.push(`Status='${Status.replace(/'/g, "''")}'`);
    if (Description !== undefined) updates.push(`Description='${Description.replace(/'/g, "''")}'`);
    if (Age !== undefined) updates.push(`Age=${Age}`);
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    const updateQuery = `UPDATE Plants SET ${updates.join(', ')} WHERE PlantID=${id}`;
    console.log('🔄 Update query:', updateQuery.substring(0, 100) + '...');
    
    await query(updateQuery);
    
    res.json({
      success: true,
      message: `Plant ${id} updated successfully`
    });
  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Authentication endpoints
// ============================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { role, username, phone, address, email, password } = req.body;
    
    console.log('📝 Registration attempt:', { role, username, email });
    
    // Validate required fields
    if (!role || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: role, username, email, password'
      });
    }
    
    // For now, we'll store users based on their role
    // In a real app, you'd have a Users table with hashed passwords
    
    let insertQuery = '';
    let userId = Date.now(); // Simple unique ID
    
    if (role === 'customer') {
      // Insert into Customers table (columns: CustomerID, FullName, Phone, Email, Address)
      insertQuery = `INSERT INTO Customers (FullName, Email, Phone, Address) VALUES ('${username}', '${email}', '${phone || ''}', '${address || ''}')`;
    } else if (role === 'employee' || role === 'agriculture_engineer') {
      // Insert into Employees table (columns: EmployeeID, Name, Role, Phone)
      insertQuery = `INSERT INTO Employees (Name, Role, Phone) VALUES ('${username}', '${role}', '${phone || ''}')`;
    } else {
      // For other roles (manager, supplier, shippment_company), we'll create a mock response
      // In production, you'd have a proper Users table
      console.log(`📋 Role '${role}' - using mock registration (no table for this role)`);
    }
    
    // Try to insert into database if query exists
    if (insertQuery) {
      try {
        await query(insertQuery);
        console.log('✅ User inserted into database');
      } catch (dbError) {
        console.log('⚠️ Could not insert into database:', dbError.message);
        // Continue anyway - we'll create a mock user
      }
    }
    
    // Create a simple token (in production, use JWT)
    const token = Buffer.from(`${email}:${role}:${userId}`).toString('base64');
    
    // Return success response matching frontend expectations
    res.status(201).json({
      success: true,
      token: token,
      user: {
        id: userId,
        email: email,
        full_name: username,
        username: username,
        role: role,
        roles: [role],
        phone: phone,
        address: address
      },
      message: 'Registration successful'
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', { email });
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Try to find user in Customers table
    let user = null;
    let role = 'customer';
    
    try {
      const customers = await query(`SELECT * FROM Customers WHERE Email = '${email}'`);
      if (customers && customers.length > 0) {
        user = customers[0];
        role = 'customer';
      }
    } catch (e) {
      console.log('Could not check Customers table');
    }
    
    // Try Employees table if not found
    if (!user) {
      try {
        const employees = await query(`SELECT * FROM Employees WHERE Email = '${email}'`);
        if (employees && employees.length > 0) {
          user = employees[0];
          role = employees[0].Position || 'employee';
        }
      } catch (e) {
        console.log('Could not check Employees table');
      }
    }
    
    // For demo purposes, allow login with any email/password
    // In production, you'd verify the password hash
    const userId = user ? (user.CustomerID || user.EmployeeID || Date.now()) : Date.now();
    const userName = user ? (user.CustomerName || user.EmployeeName || email) : email.split('@')[0];
    
    // Check for manager login (demo)
    if (email === 'admin@example.com' || email.includes('manager')) {
      role = 'manager';
    }
    
    const token = Buffer.from(`${email}:${role}:${userId}`).toString('base64');
    
    res.json({
      success: true,
      token: token,
      user: {
        id: userId,
        email: email,
        full_name: userName,
        username: userName,
        role: role,
        roles: [role]
      },
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
});

// ============================================
// Orders endpoints
// ============================================

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    let orders = [];
    try {
      orders = await query('SELECT * FROM Orders');
      if (!Array.isArray(orders)) {
        orders = [];
      }
    } catch (tableError) {
      console.log('⚠️ Orders table not found, returning empty array');
      orders = [];
    }
    
    // Transform orders to match frontend expectations
    const transformedOrders = orders.map(order => ({
      id: order.OrderID || order.id,
      customer_id: order.CustomerID || order.customer_id,
      status: (order.OrderStatus || order.status || 'pending').toLowerCase(),
      total_amount: parseFloat(order.TotalAmount || order.total_amount || 0),
      payment_method: order.PaymentMethod || order.payment_method,
      payment_status: order.PaymentStatus || order.payment_status,
      delivery_address: order.DeliveryAddress || order.delivery_address,
      notes: order.Notes || order.notes,
      complaint: order.Complaint || order.complaint,
      placed_at: order.OrderDate || order.placed_at || new Date().toISOString(),
      updated_at: order.UpdatedAt || order.updated_at || new Date().toISOString(),
      is_large_order: parseFloat(order.TotalAmount || 0) >= 3000,
      delay_reason: order.DelayReason || order.delay_reason
    }));
    
    res.json({
      success: true,
      data: transformedOrders,
      count: transformedOrders.length
    });
  } catch (error) {
    console.error('❌ Orders error:', error);
    // Return empty array instead of error
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orders = await query(`SELECT * FROM Orders WHERE OrderID = ${id}`);
    if (orders && orders.length > 0) {
      const order = orders[0];
      
      // Transform order to match frontend expectations
      const transformedOrder = {
        id: order.OrderID || order.id,
        customer_id: order.CustomerID || order.customer_id,
        status: (order.OrderStatus || order.status || 'pending').toLowerCase(),
        total_amount: parseFloat(order.TotalAmount || order.total_amount || 0),
        payment_method: order.PaymentMethod || order.payment_method,
        payment_status: order.PaymentStatus || order.payment_status,
        delivery_address: order.DeliveryAddress || order.delivery_address,
        notes: order.Notes || order.notes,
        complaint: order.Complaint || order.complaint,
        placed_at: order.OrderDate || order.placed_at || new Date().toISOString(),
        updated_at: order.UpdatedAt || order.updated_at || new Date().toISOString(),
        is_large_order: parseFloat(order.TotalAmount || 0) >= 3000,
        delay_reason: order.DelayReason || order.delay_reason
      };
      
      res.json({
        success: true,
        data: transformedOrder
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get large orders
app.get('/api/orders/large', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 3000;
    const orders = await query(`SELECT * FROM Orders WHERE TotalAmount >= ${threshold}`);
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update order status
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    
    // Map frontend status to database status
    const statusMap = {
      'pending': 'Pending',
      'approved': 'Approved',
      'preparing': 'Preparing',
      'delivered': 'Delivered to Customer',
      'controlled': 'Controlled',
      'cancelled': 'Cancelled'
    };
    
    const dbStatus = statusMap[status.toLowerCase()] || status;
    
    const updateQuery = `UPDATE Orders SET OrderStatus='${dbStatus}' WHERE OrderID=${id}`;
    await query(updateQuery);
    
    res.json({
      success: true,
      message: `Order ${id} status updated to ${status}`
    });
  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Resolve order problem
app.patch('/api/orders/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, details } = req.body;
    
    // Update order based on action
    let updateQuery = '';
    if (action === 'cancel') {
      updateQuery = `UPDATE Orders SET Status='cancelled' WHERE OrderID=${id}`;
    } else if (action === 'modify') {
      // You can add modification logic here
      updateQuery = `UPDATE Orders SET Notes='${details || 'Modified'}' WHERE OrderID=${id}`;
    }
    
    if (updateQuery) {
      await query(updateQuery);
    }
    
    res.json({
      success: true,
      message: `Order ${id} problem resolved: ${action}`
    });
  } catch (error) {
    console.error('❌ Resolve order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Inventory endpoints
// ============================================

// Get all inventory items
app.get('/api/inventory', async (req, res) => {
  try {
    // Try to get inventory from InventoryItems table
    // If table doesn't exist, return empty array
    let inventory = [];
    try {
      inventory = await query('SELECT * FROM InventoryItems');
      if (!Array.isArray(inventory)) {
        inventory = [];
      }
    } catch (tableError) {
      console.log('⚠️ InventoryItems table not found, returning empty array');
      inventory = [];
    }
    
    res.json({
      success: true,
      data: inventory,
      count: inventory.length
    });
  } catch (error) {
    console.error('❌ Inventory error:', error);
    // Return empty array instead of error
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// ============================================
// Employees endpoints
// ============================================

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    let employees = [];
    try {
      employees = await query('SELECT * FROM Employees');
      if (!Array.isArray(employees)) {
        employees = [];
      }
    } catch (tableError) {
      console.log('⚠️ Employees table not found, returning empty array');
      employees = [];
    }
    
    res.json({
      success: true,
      data: employees,
      count: employees.length
    });
  } catch (error) {
    console.error('❌ Employees error:', error);
    // Return empty array instead of error
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// Get employees count
app.get('/api/employees/count', async (req, res) => {
  try {
    let count = 0;
    try {
      const result = await query('SELECT COUNT(*) AS count FROM Employees');
      count = result && result.length > 0 ? (result[0].count || 0) : 0;
    } catch (tableError) {
      console.log('⚠️ Employees table not found, returning 0');
      count = 0;
    }
    
    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('❌ Employees count error:', error);
    // Return 0 instead of error
    res.json({
      success: true,
      count: 0
    });
  }
});

// Create employee
app.post('/api/employees', async (req, res) => {
  try {
    const { name, email, role, department, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }
    
    const insertQuery = `INSERT INTO Employees (Name, Email, Role, Department, Phone) VALUES ('${name}', '${email}', '${role || 'employee'}', '${department || ''}', '${phone || ''}')`;
    await query(insertQuery);
    
    res.json({
      success: true,
      message: 'Employee created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Analytics endpoints
// ============================================

// Get website visitors (mock data for now)
app.get('/api/analytics/visitors', async (req, res) => {
  try {
    // Mock data - in production, this would come from analytics database
    const visitors = Math.floor(Math.random() * 1000) + 500;
    res.json({
      success: true,
      visitors: visitors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Feedback endpoints
// ============================================

// Get feedback
app.get('/api/feedback', async (req, res) => {
  try {
    let feedback = [];
    try {
      const { reviewed } = req.query;
      let sql = 'SELECT * FROM CustomerFeedback';
      if (reviewed === 'false') {
        sql += " WHERE Reviewed = FALSE OR Reviewed IS NULL";
      }
      feedback = await query(sql);
      if (!Array.isArray(feedback)) {
        feedback = [];
      }
    } catch (tableError) {
      console.log('⚠️ CustomerFeedback table not found, returning empty array');
      feedback = [];
    }
    
    res.json({
      success: true,
      data: feedback,
      count: feedback.length
    });
  } catch (error) {
    console.error('❌ Feedback error:', error);
    // Return empty array instead of error
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// Update feedback review status
app.patch('/api/feedback/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const updateQuery = `UPDATE CustomerFeedback SET Reviewed = TRUE WHERE FeedbackID = ${id}`;
    await query(updateQuery);
    res.json({
      success: true,
      message: 'Feedback marked as reviewed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Reports endpoints
// ============================================

// Get sales detailed report
app.get('/api/reports/sales-detailed', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Mock data for now - in production, query Orders table with date range
    res.json({
      success: true,
      data: {
        totalSales: 0,
        salesByPeriod: [],
        salesByCategory: [],
        salesTrend: []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get orders detailed report
app.get('/api/reports/orders-detailed', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Mock data for now
    res.json({
      success: true,
      data: {
        totalOrders: 0,
        ordersByStatus: [],
        ordersByPeriod: []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get customer activity report
app.get('/api/reports/customer-activity', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Mock data for now
    res.json({
      success: true,
      data: {
        totalCustomers: 0,
        newCustomers: 0,
        returningCustomers: 0,
        averageOrdersPerCustomer: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${dbPath}`);
  console.log(`\nTest endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/test`);
  console.log(`   GET http://localhost:${PORT}/health\n`);
});
