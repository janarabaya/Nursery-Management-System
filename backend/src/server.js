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

import { query, execute, dbPath, getOrderProgress } from './database.js';

const app = express();
// Explicitly use port 5000
const PORT = Number(process.env.PORT) || 5000;

// Middleware
// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman, or same-origin requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and 127.0.0.1 on any port
    const allowedOrigins = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    ];
    
    const isAllowed = allowedOrigins.some(regex => regex.test(origin));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Handle Chrome DevTools requests (prevents 404 errors)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end();
});

// Redirect /test to /api/test (for convenience)
app.get('/test', (req, res) => {
  res.redirect('/api/test');
});

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Serve static files (images)
app.use('/images', express.static(path.join(__dirname, '../public/images')));
console.log('📷 Static images folder:', path.join(__dirname, '../public/images'));

// Test route - Get all plants
app.get('/api/test', async (req, res) => {
  const startTime = Date.now();
  console.log(`[API] GET /api/test - Request received at ${new Date().toISOString()}`);
  console.log(`[API] Request headers:`, req.headers);
  
  try {
    console.log(`[API] Querying database for plants...`);
    const plants = await query('SELECT * FROM Plants');
    const queryTime = Date.now() - startTime;
    
    console.log(`[API] Query completed in ${queryTime}ms. Found ${plants.length} plants`);
    
    const response = {
      success: true,
      count: plants.length,
      data: plants,
      timestamp: new Date().toISOString(),
      queryTime: `${queryTime}ms`
    };
    
    console.log(`[API] Sending response with ${plants.length} plants`);
    res.json(response);
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`[API] Error in /api/test after ${errorTime}ms:`, error);
    console.error(`[API] Error stack:`, error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      queryTime: `${errorTime}ms`
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
    server: 'running',
    database: dbPath,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check for API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'running',
    database: dbPath,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
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

// Get column names for a table (to debug schema issues)
app.get('/api/db/columns/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    
    // Get one row to see column names
    const sample = await query(`SELECT TOP 1 * FROM [${sanitizedTableName}]`);
    
    if (sample && sample.length > 0) {
      const columns = Object.keys(sample[0]);
      res.json({
        success: true,
        table: sanitizedTableName,
        columns: columns,
        sampleRow: sample[0]
      });
    } else {
      res.json({
        success: true,
        table: sanitizedTableName,
        columns: [],
        message: 'Table is empty'
      });
    }
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
    // Actual column names from database: PlantID, PlantName, Price, Status, Category, Description
    const fieldMapping = {
      'ID': 'PlantID',
      'PlantID': 'PlantID',
      'Name': 'PlantName',
      'PlantName': 'PlantName',
      'Type': 'Category',
      'Category': 'Category',
      'Price': 'Price',
      'Available': 'Status',
      'Status': 'Status',
      'Description': 'Description',
      'ImageURL': 'ImageURL'
    };
    
    // Fields to skip (Attachment fields in Access cannot be updated via SQL)
    // Note: Only skip actual attachment fields, not ImageURL if it's a text field
    const skipFields = ['Picture', 'Image', 'Attachment'];
    
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
        // Convert boolean to 'Available' or 'Unavailable' string
        const statusValue = value === true || value === 'true' || value === 1 ? 'Available' : 'Unavailable';
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

// Create new plant
app.post('/api/plants', async (req, res) => {
  try {
    const plantData = req.body;
    
    console.log(`[API] POST /api/plants - Create request received`);
    console.log(`[API] Plant data:`, plantData);
    
    // Validate required fields
    if (!plantData.name || plantData.price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required'
      });
    }
    
    // Prepare insert data
    // Actual database columns: PlantID, PlantName, Price, Description, Category, Status, ImageURL (or Picture)
    const name = String(plantData.name).replace(/'/g, "''");
    const priceValue = typeof plantData.price === 'string' 
      ? parseFloat(plantData.price.replace(/[^\d.]/g, '')) 
      : parseFloat(plantData.price);
    const description = plantData.description ? String(plantData.description).replace(/'/g, "''") : '';
    const imageUrl = plantData.imageUrl ? String(plantData.imageUrl).replace(/'/g, "''") : '';
    const category = plantData.category || plantData.type || '';
    
    if (isNaN(priceValue)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price value'
      });
    }
    
    // Find CategoryID from Categories table if category name is provided
    let categoryID = null;
    if (plantData.categoryID !== undefined || plantData.CategoryID !== undefined) {
      categoryID = parseInt(plantData.categoryID || plantData.CategoryID);
      if (isNaN(categoryID)) {
        categoryID = null;
      }
    } else if (category) {
      try {
        const categories = await query(`SELECT [CategoryID] FROM [Categories] WHERE [CategoryName]='${String(category).replace(/'/g, "''")}'`);
        if (categories && categories.length > 0) {
          categoryID = categories[0].CategoryID;
        } else {
          console.log(`⚠️ Category '${category}' not found, creating plant without CategoryID`);
        }
      } catch (catError) {
        console.log(`⚠️ Could not lookup CategoryID: ${catError.message}`);
      }
    }
    
    // Build INSERT query - use actual column names: PlantName, Status, CategoryID
    // Picture/ImageURL might be Attachment field which cannot be inserted via SQL
    let insertQuery;
    const columns = ['[PlantName]', '[Price]', '[Description]'];
    const values = [`'${name}'`, `${priceValue}`, `'${description}'`];
    
    // Add Status column - map available to Status
    const status = (plantData.available !== false && plantData.available !== undefined) ? 'Available' : 'Unavailable';
    columns.push('[Status]');
    values.push(`'${status}'`);
    
    // Add CategoryID if found
    if (categoryID !== null) {
      columns.push('[CategoryID]');
      values.push(`${categoryID}`);
    }
    
    // Skip Picture/ImageURL in INSERT - Access Attachment fields cannot be inserted via SQL
    // Image URLs should be stored separately or handled via Access UI
    // We'll skip this field to avoid errors
    
    insertQuery = `INSERT INTO [Plants] (${columns.join(', ')}) VALUES (${values.join(', ')})`;
    console.log(`[API] Insert query:`, insertQuery);
    
    await execute(insertQuery);
    console.log(`[API] Plant created successfully`);
    
    // Wait a small moment to ensure the database has committed the transaction
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Fetch the newly created plant - use TOP 1 and ORDER BY to get the most recent
    let newPlant = null;
    try {
      // First try: Get the plant with the highest PlantID that matches the name
      const created = await query(`SELECT TOP 1 * FROM [Plants] WHERE [PlantName]='${name.replace(/'/g, "''")}' ORDER BY [PlantID] DESC`);
      if (created && created.length > 0) {
        newPlant = created[0];
        console.log(`[API] ✅ Found plant by name with ID: ${newPlant.PlantID}`);
      } else {
        // Second try: Get the plant with the highest PlantID overall (in case name matching fails)
        const latest = await query(`SELECT TOP 1 * FROM [Plants] ORDER BY [PlantID] DESC`);
        if (latest && latest.length > 0) {
          newPlant = latest[0];
          console.log(`[API] ⚠️ Could not find plant by name, using latest plant with ID ${newPlant.PlantID}`);
        }
      }
    } catch (fetchError) {
      console.error(`[API] ⚠️ Error fetching created plant:`, fetchError.message);
      // Try one more time with a simpler query
      try {
        const allPlants = await query(`SELECT * FROM [Plants]`);
        if (allPlants && allPlants.length > 0) {
          // Get the plant with the highest PlantID
          const sorted = allPlants.sort((a, b) => (b.PlantID || 0) - (a.PlantID || 0));
          newPlant = sorted[0];
          console.log(`[API] ⚠️ Using fallback method to get created plant with ID: ${newPlant.PlantID}`);
        }
      } catch (fallbackError) {
        console.error(`[API] ❌ Fallback fetch also failed:`, fallbackError.message);
      }
    }
    
    if (!newPlant) {
      console.error(`[API] ❌ Plant created but could not be retrieved from database`);
      return res.status(500).json({
        success: false,
        error: 'Plant created but could not be retrieved. Please refresh the page to see the new plant.'
      });
    }
    
    console.log(`[API] ✅ Successfully retrieved created plant with ID: ${newPlant.PlantID || 'unknown'}`);
    
    // Get category name if CategoryID exists
    let categoryName = '';
    if (newPlant.CategoryID) {
      try {
        // CategoryID might be stored as string or number, try both formats
        const categoryIDValue = newPlant.CategoryID;
        // Try as number first
        let categories = [];
        try {
          categories = await query(`SELECT [CategoryName] FROM [Categories] WHERE [CategoryID]=${categoryIDValue}`);
        } catch (numError) {
          // If that fails, try as string
          try {
            categories = await query(`SELECT [CategoryName] FROM [Categories] WHERE [CategoryID]='${categoryIDValue}'`);
          } catch (strError) {
            console.log(`⚠️ Could not fetch category name (tried both number and string): ${strError.message}`);
          }
        }
        if (categories && categories.length > 0) {
          categoryName = categories[0].CategoryName || '';
        }
      } catch (catError) {
        console.log(`⚠️ Could not fetch category name: ${catError.message}`);
      }
    }
    
    // Transform to match frontend format
    const response = {
      success: true,
      data: {
        id: newPlant.PlantID || newPlant.Plant_ID || newPlant.ID,
        name: newPlant.PlantName || newPlant.Name || '',
        price: parseFloat(newPlant.Price || 0),
        description: newPlant.Description || '',
        category: categoryName || newPlant.Category || plantData.category || '',
        categoryID: newPlant.CategoryID || null,
        available: (newPlant.Status === 'Available' || newPlant.Status === true || newPlant.Available === true),
        imageUrl: newPlant.ImageURL || newPlant.ImageUrl || newPlant.Picture || '',
        type: categoryName || newPlant.Category || plantData.category || 'flower'
      },
      message: 'Plant created successfully'
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error(`[API] ❌ Create error:`, error);
    console.error(`[API] Error stack:`, error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create plant'
    });
  }
});

// Update plant by ID
app.put('/api/plants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`[API] PUT /api/plants/${id} - Update request received`);
    console.log(`[API] Update data:`, updateData);
    
    // Check if plant exists
    const existing = await query(`SELECT * FROM [Plants] WHERE [PlantID] = ${id}`);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Plant not found' 
      });
    }
    
    const plant = existing[0];
    
    // Build update query dynamically - map frontend fields to database fields
    const updates = [];
    
    // Map common field names to database column names
    // Use brackets around column names for Access Database compatibility
    // Actual database columns: PlantID, PlantName, Price, Description, Category, Status, ImageURL (or Picture)
    if (updateData.name !== undefined || updateData.PlantName !== undefined) {
      const name = updateData.name || updateData.PlantName;
      updates.push(`[PlantName]='${String(name).replace(/'/g, "''")}'`);
    }
    
    if (updateData.price !== undefined || updateData.Price !== undefined) {
      const priceValue = updateData.price || updateData.Price;
      // Handle price as number or string with currency symbols
      const numericPrice = typeof priceValue === 'string' 
        ? parseFloat(priceValue.replace(/[^\d.]/g, '')) 
        : parseFloat(priceValue);
      if (!isNaN(numericPrice)) {
        updates.push(`[Price]=${numericPrice}`);
      }
    }
    
    if (updateData.description !== undefined || updateData.Description !== undefined) {
      const desc = updateData.description || updateData.Description;
      updates.push(`[Description]='${String(desc).replace(/'/g, "''")}'`);
    }
    
    // CategoryID - need to find CategoryID from Categories table if category name is provided
    if (updateData.categoryID !== undefined || updateData.CategoryID !== undefined) {
      const categoryID = updateData.categoryID || updateData.CategoryID;
      const numericCategoryID = parseInt(categoryID);
      if (!isNaN(numericCategoryID)) {
        updates.push(`[CategoryID]=${numericCategoryID}`);
      }
    } else if (updateData.category !== undefined || updateData.Category !== undefined || updateData.type !== undefined || updateData.Type !== undefined) {
      // Try to find CategoryID from Categories table by name
      try {
        const categoryName = updateData.category || updateData.Category || updateData.type || updateData.Type;
        const categories = await query(`SELECT [CategoryID] FROM [Categories] WHERE [CategoryName]='${String(categoryName).replace(/'/g, "''")}'`);
        if (categories && categories.length > 0) {
          updates.push(`[CategoryID]=${categories[0].CategoryID}`);
        } else {
          console.log(`⚠️ Category '${categoryName}' not found in Categories table, skipping CategoryID update`);
        }
      } catch (catError) {
        console.log(`⚠️ Could not lookup CategoryID: ${catError.message}`);
      }
    }
    
    // Status column - map available to Status
    if (updateData.available !== undefined) {
      const status = (updateData.available === true || updateData.available === 'true' || updateData.available === 'Available') ? 'Available' : 'Unavailable';
      updates.push(`[Status]='${status}'`);
    }
    
    // Skip Picture/ImageURL in UPDATE - Access Attachment fields cannot be updated via SQL
    // Image URLs should be stored separately or handled via Access UI
    // We'll skip this field to avoid errors, but log it for reference
    if (updateData.imageUrl !== undefined || updateData.ImageURL !== undefined || updateData.image_url !== undefined) {
      const imageUrl = updateData.imageUrl || updateData.ImageURL || updateData.image_url;
      if (imageUrl) {
        console.log(`[API] ⚠️ Image URL provided but not updated (Access Attachment fields cannot be updated via SQL): ${imageUrl}`);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid fields to update' 
      });
    }
    
    // Execute updates one by one to avoid Access parameter issues
    // Access Database sometimes has issues with multiple column updates
    for (const updateClause of updates) {
      const updateQuery = `UPDATE [Plants] SET ${updateClause} WHERE [PlantID]=${id}`;
      console.log(`[API] Update query:`, updateQuery);
      try {
        await execute(updateQuery);
        console.log(`[API] Updated: ${updateClause}`);
      } catch (updateError) {
        console.error(`[API] ⚠️ Failed to update ${updateClause}:`, updateError.message);
        // Continue with other updates even if one fails
      }
    }
    
    console.log(`[API] Plant ${id} update operations completed`);
    
    // Fetch updated plant to return
    const updated = await query(`SELECT * FROM [Plants] WHERE [PlantID] = ${id}`);
    const updatedPlant = updated[0];
    
    // Get category name if CategoryID exists
    let categoryName = '';
    if (updatedPlant.CategoryID) {
      try {
        // CategoryID might be stored as string or number, try both formats
        const categoryIDValue = updatedPlant.CategoryID;
        // Try as number first
        let categories = [];
        try {
          categories = await query(`SELECT [CategoryName] FROM [Categories] WHERE [CategoryID]=${categoryIDValue}`);
        } catch (numError) {
          // If that fails, try as string
          try {
            categories = await query(`SELECT [CategoryName] FROM [Categories] WHERE [CategoryID]='${categoryIDValue}'`);
          } catch (strError) {
            console.log(`⚠️ Could not fetch category name (tried both number and string): ${strError.message}`);
          }
        }
        if (categories && categories.length > 0) {
          categoryName = categories[0].CategoryName || '';
        }
      } catch (catError) {
        console.log(`⚠️ Could not fetch category name: ${catError.message}`);
        // Use Category column directly if available
        if (updatedPlant.Category) {
          categoryName = updatedPlant.Category;
        }
      }
    } else if (updatedPlant.Category) {
      categoryName = updatedPlant.Category;
    }
    
    // Transform to match frontend format
    const response = {
      success: true,
      data: {
        id: updatedPlant.PlantID || updatedPlant.Plant_ID || updatedPlant.ID || id,
        name: updatedPlant.PlantName || updatedPlant.Name || '',
        price: parseFloat(updatedPlant.Price || 0),
        description: updatedPlant.Description || '',
        category: categoryName || updatedPlant.Category || '',
        categoryID: updatedPlant.CategoryID || null,
        available: (updatedPlant.Status === 'Available' || updatedPlant.Status === true || updatedPlant.Available === true),
        imageUrl: updatedPlant.ImageURL || updatedPlant.ImageUrl || updatedPlant.Picture || '',
        type: categoryName || updatedPlant.Category || 'flower'
      },
      message: `Plant ${id} updated successfully`
    };
    
    res.json(response);
  } catch (error) {
    const plantId = req.params.id || 'unknown';
    console.error(`[API] ❌ Update error for plant ${plantId}:`, error);
    console.error(`[API] Error stack:`, error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update plant'
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
      // Join Orders with Customers to get customer information
      orders = await query(`
        SELECT o.*, c.FullName, c.Email, c.Phone, c.Address
        FROM Orders o
        LEFT JOIN Customers c ON o.CustomerID = c.CustomerID
        ORDER BY o.OrderDate DESC
      `);
      if (!Array.isArray(orders)) {
        orders = [];
      }
    } catch (tableError) {
      console.log('⚠️ Orders table not found, returning empty array:', tableError.message);
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
      delivery_address: order.DeliveryAddress || order.delivery_address || order.Address || '',
      notes: order.Notes || order.notes,
      complaint: order.Complaint || order.complaint,
      placed_at: order.OrderDate || order.placed_at || new Date().toISOString(),
      updated_at: order.UpdatedAt || order.updated_at || new Date().toISOString(),
      is_large_order: parseFloat(order.TotalAmount || 0) >= 3000,
      delay_reason: order.DelayReason || order.delay_reason,
      // Add customer information
      customer: {
        user: {
          full_name: order.FullName || 'N/A',
          email: order.Email || 'N/A',
          phone: order.Phone || 'N/A'
        }
      }
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

// Get large orders (must be before /api/orders/:id to avoid route conflict)
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

// Get Order Progress by Order ID (must be before /api/orders/:id to avoid route conflict)
app.get('/api/orders/:id/progress', async (req, res) => {
  console.log(`\n🔵 [ROUTE HIT] /api/orders/:id/progress`);
  console.log(`🔵 Request URL: ${req.originalUrl}`);
  console.log(`🔵 Request Method: ${req.method}`);
  console.log(`🔵 Params:`, req.params);
  
  try {
    const { id } = req.params;
    const orderID = parseInt(id);
    
    console.log(`\n[API] ==========================================`);
    console.log(`[API] GET /api/orders/:id/progress - Order ID: ${orderID}`);
    console.log(`[API] ==========================================\n`);
    
    if (isNaN(orderID)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Order ID. Must be a number.'
      });
    }
    
    // First, check if order exists
    const checkOrderSQL = `SELECT [OrderID] FROM [Orders] WHERE [OrderID] = ${orderID}`;
    console.log(`[API] Step 1: Checking if order exists: ${checkOrderSQL}`);
    
    let orderExists = false;
    try {
      const checkResult = await query(checkOrderSQL);
      if (checkResult && checkResult.length > 0) {
        orderExists = true;
        console.log(`[API] ✅ Order ID ${orderID} exists in database`);
      } else {
        console.log(`[API] ❌ Order ID ${orderID} NOT found in database`);
        return res.status(404).json({
          message: "Order not found"
        });
      }
    } catch (checkError) {
      console.error(`[API] ❌ Error checking order existence:`, checkError.message);
      return res.status(500).json({
        success: false,
        error: `Database error: ${checkError.message}`
      });
    }
    
    // Try different column names for Order Progress
    const possibleColumnNames = [
      '[Order Progress]',
      'OrderProgress',
      '[OrderProgress]',
      'Order_Progress',
      '[Order_Progress]',
      'Progress',
      '[Progress]',
      'OrderStatus',
      '[OrderStatus]'
    ];
    
    let orderProgress = null;
    let foundColumn = null;
    
    for (const columnName of possibleColumnNames) {
      try {
        const sql = `SELECT ${columnName} FROM [Orders] WHERE [OrderID] = ${orderID}`;
        console.log(`[API] Step 2: Trying column "${columnName}": ${sql}`);
        
        const result = await query(sql);
        
        if (result && result.length > 0) {
          // Try different ways to access the value
          const row = result[0];
          orderProgress = row[columnName] || 
                         row[columnName.replace(/[\[\]]/g, '')] || 
                         row[columnName.replace(/[\[\]]/g, '').replace(/\s+/g, '_')] ||
                         row[columnName.replace(/[\[\]]/g, '').replace(/\s+/g, '')] ||
                         null;
          
          if (orderProgress !== null && orderProgress !== undefined) {
            foundColumn = columnName;
            console.log(`[API] ✅ Found Order Progress in column "${columnName}": ${orderProgress}`);
            break;
          }
        }
      } catch (colError) {
        console.log(`[API] ⚠️ Column "${columnName}" not found or error: ${colError.message}`);
        continue;
      }
    }
    
    // If still not found, try SELECT * and search all columns
    if (orderProgress === null || orderProgress === undefined) {
      try {
        console.log(`[API] Step 3: Trying SELECT * to find Order Progress column...`);
        const allColumnsSQL = `SELECT * FROM [Orders] WHERE [OrderID] = ${orderID}`;
        const allResult = await query(allColumnsSQL);
        
        if (allResult && allResult.length > 0) {
          const row = allResult[0];
          console.log(`[API] Available columns:`, Object.keys(row));
          
          // Look for any column that might be Order Progress
          for (const key of Object.keys(row)) {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('progress') || 
                keyLower.includes('order progress') ||
                keyLower === 'orderprogress' ||
                keyLower.includes('status')) {
              orderProgress = row[key];
              foundColumn = key;
              console.log(`[API] ✅ Found Order Progress in column "${key}": ${orderProgress}`);
              break;
            }
          }
        }
      } catch (allError) {
        console.error(`[API] ❌ Error with SELECT *:`, allError.message);
      }
    }
    
    if (orderProgress === null || orderProgress === undefined) {
      console.log(`[API] ❌ Order Progress column not found for Order ID ${orderID}`);
      return res.status(404).json({
        message: "Order Progress not found for this order"
      });
    }
    
    console.log(`[API] ✅ Successfully retrieved Order Progress: ${orderProgress}`);
    console.log(`[API] ==========================================\n`);
    
    res.json({
      orderID: orderID,
      orderProgress: String(orderProgress)
    });
  } catch (error) {
    console.error('[API] ❌ Error retrieving Order Progress:', error);
    console.error('[API] ❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve Order Progress'
    });
  }
});

// Get order by ID (must be after /api/orders/:id/progress to avoid route conflict)
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let orders = [];
    let customerInfo = null;
    
    try {
      // Try to join Orders with Customers to get customer information
      orders = await query(`
        SELECT o.*, c.FullName, c.Email, c.Phone, c.Address
        FROM Orders o
        LEFT JOIN Customers c ON o.CustomerID = c.CustomerID
        WHERE o.OrderID = ${id}
      `);
    } catch (joinError) {
      console.log('⚠️ JOIN failed, trying simple query:', joinError.message);
      // Fallback: Get order without JOIN
      try {
        orders = await query(`SELECT * FROM Orders WHERE OrderID = ${id}`);
        // Try to get customer info separately
        if (orders && orders.length > 0 && orders[0].CustomerID) {
          try {
            const customers = await query(`SELECT * FROM Customers WHERE CustomerID = ${orders[0].CustomerID}`);
            if (customers && customers.length > 0) {
              customerInfo = customers[0];
            }
          } catch (customerError) {
            console.log('⚠️ Could not fetch customer info:', customerError.message);
          }
        }
      } catch (orderError) {
        console.error('❌ Error fetching order:', orderError.message);
        throw orderError;
      }
    }
    
    if (orders && orders.length > 0) {
      const order = orders[0];
      
      // Use customer info from JOIN or separate query
      const customer = customerInfo || order;
      
      // Fetch order items
      let orderItems = [];
      try {
        const items = await query(`
          SELECT oi.*, p.PlantName, p.Price
          FROM OrderItems oi
          LEFT JOIN Plants p ON oi.InventoryItemID = p.PlantID
          WHERE oi.OrderID = ${id}
        `);
        if (items && Array.isArray(items)) {
          orderItems = items.map(item => ({
            id: item.OrderItemID || item.ID || Date.now(),
            inventory_item_id: item.InventoryItemID || item.PlantID,
            quantity: item.Quantity || item.quantity || 1,
            unit_price: parseFloat(item.UnitPrice || item.Price || 0),
            inventory_item: {
              id: item.InventoryItemID || item.PlantID,
              name: item.PlantName || 'Unknown',
              plant: {
                id: item.InventoryItemID || item.PlantID,
                name: item.PlantName || 'Unknown'
              }
            }
          }));
        }
      } catch (itemsError) {
        console.log('⚠️ Could not fetch order items:', itemsError.message);
      }
      
      // Transform order to match frontend expectations
      const transformedOrder = {
        id: order.OrderID || order.id,
        customer_id: order.CustomerID || order.customer_id,
        status: (order.OrderStatus || order.status || 'pending').toLowerCase(),
        total_amount: parseFloat(order.TotalAmount || order.total_amount || 0),
        payment_method: order.PaymentMethod || order.payment_method,
        payment_status: order.PaymentStatus || order.payment_status,
        delivery_address: order.DeliveryAddress || order.delivery_address || customer.Address || '',
        notes: order.Notes || order.notes,
        complaint: order.Complaint || order.complaint,
        placed_at: order.OrderDate || order.placed_at || new Date().toISOString(),
        updated_at: order.UpdatedAt || order.updated_at || new Date().toISOString(),
        is_large_order: parseFloat(order.TotalAmount || 0) >= 3000,
        delay_reason: order.DelayReason || order.delay_reason,
        order_items: orderItems,
        // Add customer information
        customer: {
          user: {
            full_name: customer.FullName || 'N/A',
            email: customer.Email || 'N/A',
            phone: customer.Phone || 'N/A'
          }
        }
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
    console.error('❌ Error fetching order details:', error);
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

// Postpone order delivery date
app.patch('/api/orders/:id/postpone', async (req, res) => {
  try {
    const OrderID = req.params.id;
    const NewDeliveryDate = req.body.newDeliveryDate || req.body.NewDeliveryDate;
    
    console.log('📅 Postpone request received:', { OrderID, NewDeliveryDate, body: req.body });
    
    if (!NewDeliveryDate) {
      return res.status(400).json({ success: false, message: 'Delivery date is required' });
    }
    
    // Parse and validate the date
    let deliveryDate;
    try {
      deliveryDate = new Date(NewDeliveryDate);
      if (isNaN(deliveryDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (dateError) {
      console.error('❌ Invalid date format:', NewDeliveryDate);
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    
    // Format date for Access (MM/DD/YYYY or #MM/DD/YYYY#)
    const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
    const day = String(deliveryDate.getDate()).padStart(2, '0');
    const year = deliveryDate.getFullYear();
    const formattedDate = `#${month}/${day}/${year}#`;
    const formattedDateISO = `${year}-${month}-${day}`;
    
    console.log('📅 Formatted date for Access:', { formattedDate, formattedDateISO });
    
    // Update DeliveryDate in Orders table
    const updateQuery = `UPDATE [Orders] SET [DeliveryDate] = ${formattedDate} WHERE [OrderID] = ${OrderID}`;
    console.log('📅 Executing update query:', updateQuery);
    
    await execute(updateQuery);
    console.log('✅ DeliveryDate updated successfully for OrderID:', OrderID);
    
    res.json({
      success: true,
      message: `Order delivery date postponed to ${formattedDateISO}`,
      newDeliveryDate: formattedDateISO
    });
  } catch (error) {
    console.error('❌ Postpone order error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      odbcErrors: error.odbcErrors
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to postpone order delivery date'
    });
  }
});

// Compensate customer with discount or gift
app.patch('/api/orders/:id/compensate', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, discountPercentage, plantId, quantity } = req.body;
    
    // Get current order
    const orders = await query(`SELECT * FROM Orders WHERE OrderID = ${id}`);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const order = orders[0];
    const currentNotes = order.Notes || order.notes || '';
    let compensationNote = '';
    let result = {};
    
    if (type === 'discount') {
      // Apply discount
      const currentTotal = parseFloat(order.TotalAmount || order.total_amount || 0);
      
      if (currentTotal <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid order total amount' });
      }
      
      if (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100) {
        return res.status(400).json({ success: false, message: 'Invalid discount percentage' });
      }
      
      // Extract original amount from notes if it exists (to avoid double discounting)
      let originalAmount = currentTotal;
      const notesMatch = currentNotes.match(/Original:\s*₪?([\d.]+)/i);
      if (notesMatch) {
        // If we find an original amount in notes, use it
        originalAmount = parseFloat(notesMatch[1]);
        console.log(`📝 Found original amount in notes: ₪${originalAmount.toFixed(2)}`);
      } else {
        // If no previous discount, check if we can get original from OrderDate or first creation
        // For now, we'll use currentTotal as original if no previous discount found
        originalAmount = currentTotal;
        console.log(`📝 Using current total as original: ₪${originalAmount.toFixed(2)}`);
      }
      
      // Calculate discount based on ORIGINAL amount, not current amount
      const discountAmount = originalAmount * (discountPercentage / 100);
      const newTotal = originalAmount - discountAmount;
      
      // Update TotalAmount in database
      const updateQuery = `UPDATE Orders SET TotalAmount = ${newTotal} WHERE OrderID = ${id}`;
      await execute(updateQuery);
      
      compensationNote = `[Compensation: ${discountPercentage}% discount applied. Original: ₪${originalAmount.toFixed(2)}, New Total: ₪${newTotal.toFixed(2)}, Discount: ₪${discountAmount.toFixed(2)}]`;
      
      result = {
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        newTotal: newTotal,
        discountPercentage: discountPercentage
      };
      
      console.log(`✅ Discount compensation applied: Order ${id} - ${discountPercentage}% discount on original ₪${originalAmount.toFixed(2)}, New Total: ₪${newTotal.toFixed(2)}`);
      
    } else if (type === 'gift') {
      // Add gift plant to order
      if (!plantId || !quantity || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Plant ID and quantity are required' });
      }
      
      // Get plant details
      let plantName = 'Unknown Plant';
      try {
        const plants = await query(`SELECT * FROM Plants WHERE PlantID = ${plantId}`);
        if (plants && plants.length > 0) {
          plantName = plants[0].PlantName || plants[0].Name || 'Unknown Plant';
        }
      } catch (plantError) {
        console.log('⚠️ Could not fetch plant details:', plantError.message);
      }
      
      compensationNote = `[Compensation: Gift of ${quantity} ${plantName}(s) added to order. Plant ID: ${plantId}, Quantity: ${quantity}]`;
      
      result = {
        plantId: parseInt(plantId),
        plantName: plantName,
        quantity: parseInt(quantity)
      };
      
      console.log(`✅ Gift compensation applied: Order ${id} - ${quantity} ${plantName}(s)`);
      
    } else {
      return res.status(400).json({ success: false, message: 'Invalid compensation type. Must be "discount" or "gift"' });
    }
    
    // Add note about compensation
    const updatedNotes = currentNotes ? `${currentNotes}\n${compensationNote}` : compensationNote;
    
    try {
      const notesUpdateQuery = `UPDATE Orders SET Notes = '${updatedNotes.replace(/'/g, "''")}' WHERE OrderID = ${id}`;
      await execute(notesUpdateQuery);
    } catch (notesError) {
      console.log('⚠️ Could not update Notes field:', notesError.message);
    }
    
    res.json({
      success: true,
      message: `Compensation applied successfully`,
      type: type,
      ...result
    });
  } catch (error) {
    console.error('❌ Compensate order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Resolve order problem
// Update order (modify order details)
app.put('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_address, notes, total_amount, order_items } = req.body;
    
    // Get current order
    const orders = await query(`SELECT * FROM Orders WHERE OrderID = ${id}`);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const order = orders[0];
    const updates = [];
    
    // Update delivery address if provided
    if (delivery_address !== undefined) {
      updates.push(`DeliveryAddress='${delivery_address.replace(/'/g, "''")}'`);
    }
    
    // Update notes if provided
    if (notes !== undefined) {
      updates.push(`Notes='${notes.replace(/'/g, "''")}'`);
    }
    
    // Update total amount if provided
    if (total_amount !== undefined) {
      updates.push(`TotalAmount=${parseFloat(total_amount)}`);
    }
    
    // Update order if there are changes
    if (updates.length > 0) {
      const updateQuery = `UPDATE Orders SET ${updates.join(', ')} WHERE OrderID=${id}`;
      await execute(updateQuery);
      console.log(`✅ Order ${id} updated: ${updates.length} field(s)`);
    }
    
    // Update order items if provided
    if (order_items && Array.isArray(order_items)) {
      // Delete existing order items
      try {
        await execute(`DELETE FROM OrderItems WHERE OrderID = ${id}`);
        console.log(`✅ Deleted existing order items for order ${id}`);
      } catch (deleteError) {
        console.log('⚠️ Could not delete existing order items (table might not exist):', deleteError.message);
      }
      
      // Insert new order items
      for (const item of order_items) {
        try {
          const insertQuery = `INSERT INTO OrderItems (OrderID, InventoryItemID, Quantity, UnitPrice) VALUES (${id}, ${item.inventory_item_id}, ${item.quantity}, ${item.unit_price})`;
          await execute(insertQuery);
        } catch (insertError) {
          console.log('⚠️ Could not insert order item:', insertError.message);
        }
      }
      console.log(`✅ Inserted ${order_items.length} order item(s) for order ${id}`);
    }
    
    res.json({
      success: true,
      message: `Order ${id} updated successfully`
    });
  } catch (error) {
    console.error('❌ Update order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.patch('/api/orders/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, details } = req.body;
    
    // Update order based on action
    let updateQuery = '';
    if (action === 'cancel') {
      updateQuery = `UPDATE Orders SET OrderStatus='Cancelled' WHERE OrderID=${id}`;
    } else if (action === 'modify') {
      // You can add modification logic here
      updateQuery = `UPDATE Orders SET Notes='${details || 'Modified'}' WHERE OrderID=${id}`;
    }
    
    if (updateQuery) {
      await execute(updateQuery);
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

// Get employee by email
app.get('/api/employees/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);
    
    const employees = await query(`
      SELECT [Full Name] as full_name, Email as email, Phone as phone, Role as role
      FROM Employees
      WHERE Email = '${decodedEmail.replace(/'/g, "''")}'
    `);
    
    if (!employees || employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found with this email' });
    }
    
    const employee = employees[0];
    res.json({
      success: true,
      data: {
        full_name: employee.full_name,
        email: employee.email,
        phone: employee.phone || null,
        role: employee.role || null
      }
    });
  } catch (error) {
    console.error('❌ Get employee by email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, phone } = req.body;
    
    // Check if employee exists
    const existing = await query(`SELECT UserID FROM Employees WHERE UserID = '${id.replace(/'/g, "''")}' OR EmployeeID = '${id.replace(/'/g, "''")}'`);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const userId = existing[0].UserID || id;
    
    // Update employee data
    const updates = [];
    if (full_name) updates.push(`[Full Name] = '${full_name.replace(/'/g, "''")}'`);
    if (email) updates.push(`Email = '${email.replace(/'/g, "''")}'`);
    if (phone !== undefined) updates.push(`Phone = '${phone.replace(/'/g, "''")}'`);
    if (role) updates.push(`Role = '${role.replace(/'/g, "''")}'`);
    
    if (updates.length > 0) {
      await query(`UPDATE Employees SET ${updates.join(', ')} WHERE UserID = '${userId.replace(/'/g, "''")}'`);
    }
    
    // Fetch updated employee
    const updated = await query(`
      SELECT e.UserID as user_id, e.[Full Name] as full_name, e.Email as email, 
             e.Phone as phone, e.Role as role, e.IsActive as is_active
      FROM Employees e
      WHERE e.UserID = '${userId.replace(/'/g, "''")}'
    `);
    
    if (!updated || updated.length === 0) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve updated employee' });
    }
    
    res.json({
      success: true,
      data: {
        id: updated[0].user_id,
        full_name: updated[0].full_name,
        email: updated[0].email,
        phone: updated[0].phone,
        role: updated[0].role,
        is_active: updated[0].is_active
      }
    });
  } catch (error) {
    console.error('❌ Update employee error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update employee status
app.patch('/api/employees/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    const existing = await query(`SELECT UserID FROM Employees WHERE UserID = '${id.replace(/'/g, "''")}' OR EmployeeID = '${id.replace(/'/g, "''")}'`);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const userId = existing[0].UserID || id;
    
    await query(`UPDATE Employees SET IsActive = ${is_active ? 'TRUE' : 'FALSE'} WHERE UserID = '${userId.replace(/'/g, "''")}'`);
    
    res.json({
      success: true,
      data: { user_id: userId, is_active }
    });
  } catch (error) {
    console.error('❌ Update employee status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find employee by UserID first
    let existing = await query(`SELECT UserID FROM Employees WHERE UserID = '${id.replace(/'/g, "''")}'`);
    
    // If not found, try to find by EmployeeID
    if (!existing || existing.length === 0) {
      existing = await query(`SELECT UserID FROM Employees WHERE EmployeeID = '${id.replace(/'/g, "''")}'`);
    }
    
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const userId = existing[0].UserID || id;
    
    // Soft delete
    await query(`UPDATE Employees SET IsActive = FALSE WHERE UserID = '${userId.replace(/'/g, "''")}'`);
    
    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete employee error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Tasks endpoints
// ============================================

// Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const { employee_id, title, description, deadline } = req.body;
    
    if (!employee_id || !title || !deadline) {
      return res.status(400).json({ success: false, message: 'Employee ID, title, and deadline are required' });
    }
    
    // Check if employee exists
    let employee = [];
    try {
      employee = await query(`SELECT UserID FROM Employees WHERE UserID = '${employee_id.replace(/'/g, "''")}'`);
    } catch (err) {
      console.log('⚠️ Error checking employee:', err);
    }
    
    if (!employee || employee.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // Check if Tasks table exists
    try {
      const taskId = `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const deadlineDate = new Date(deadline);
      const createdAt = new Date();
      
      const insertQuery = `INSERT INTO Tasks (TaskID, EmployeeID, Title, Description, Deadline, Status, CreatedAt) VALUES ('${taskId.replace(/'/g, "''")}', '${employee_id.replace(/'/g, "''")}', '${title.replace(/'/g, "''")}', '${(description || '').replace(/'/g, "''")}', #${deadlineDate.toISOString().split('T')[0]} ${deadlineDate.toTimeString().split(' ')[0]}#, 'pending', #${createdAt.toISOString().split('T')[0]} ${createdAt.toTimeString().split(' ')[0]}#)`;
      
      await query(insertQuery);
      
      // Fetch created task
      const tasks = await query(`
        SELECT t.TaskID as id, t.EmployeeID as employee_id, t.Title as title,
               t.Description as description, t.Deadline as deadline, t.Status as status,
               t.CreatedAt as created_at, e.[Full Name] as employee_name, e.Email as employee_email
        FROM Tasks t
        LEFT JOIN Employees e ON t.EmployeeID = e.UserID
        WHERE t.TaskID = '${taskId.replace(/'/g, "''")}'
      `);
      
      if (!tasks || tasks.length === 0) {
        return res.status(500).json({ success: false, message: 'Failed to retrieve created task' });
      }
      
      res.json({
        success: true,
        data: {
          id: tasks[0].id,
          employee_id: tasks[0].employee_id,
          employee_name: tasks[0].employee_name || 'Unknown',
          employee_email: tasks[0].employee_email || '',
          title: tasks[0].title,
          description: tasks[0].description || '',
          deadline: tasks[0].deadline,
          status: tasks[0].status || 'pending',
          created_at: tasks[0].created_at
        }
      });
    } catch (tableError) {
      console.error('❌ Tasks table error:', tableError);
      return res.status(500).json({ 
        success: false, 
        message: 'Tasks table not found. Please create the Tasks table in the database.',
        error: tableError.message 
      });
    }
  } catch (error) {
    console.error('❌ Create task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    
    let tasks = [];
    try {
      let whereClause = '1=1';
      if (employee_id) {
        whereClause += ` AND t.EmployeeID = '${employee_id.replace(/'/g, "''")}'`;
      }
      if (status) {
        whereClause += ` AND t.Status = '${status.replace(/'/g, "''")}'`;
      }
      
      tasks = await query(`
        SELECT t.TaskID as id, t.EmployeeID as employee_id, t.Title as title,
               t.Description as description, t.Deadline as deadline, t.Status as status,
               t.CreatedAt as created_at, e.[Full Name] as employee_name, e.Email as employee_email
        FROM Tasks t
        LEFT JOIN Employees e ON t.EmployeeID = e.UserID
        WHERE ${whereClause}
        ORDER BY t.CreatedAt DESC
      `);
    } catch (tableError) {
      console.log('⚠️ Tasks table not found, returning empty array');
      tasks = [];
    }
    
    const formattedTasks = (tasks || []).map(t => ({
      id: t.id,
      employee_id: t.employee_id,
      employee_name: t.employee_name || 'Unknown',
      employee_email: t.employee_email || '',
      title: t.title,
      description: t.description || '',
      deadline: t.deadline,
      status: t.status || 'pending',
      created_at: t.created_at
    }));
    
    res.json({
      success: true,
      data: formattedTasks
    });
  } catch (error) {
    console.error('❌ Get tasks error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

// Update task status
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'completed', 'in_progress', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required (pending, completed, in_progress, cancelled)' });
    }
    
    try {
      // Check if task exists
      const existing = await query(`SELECT TaskID FROM Tasks WHERE TaskID = '${id.replace(/'/g, "''")}'`);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      // Update task status
      const updatedAt = new Date();
      await query(`UPDATE Tasks SET Status = '${status.replace(/'/g, "''")}', UpdatedAt = #${updatedAt.toISOString().split('T')[0]} ${updatedAt.toTimeString().split(' ')[0]}# WHERE TaskID = '${id.replace(/'/g, "''")}'`);
      
      // Fetch updated task
      const tasks = await query(`
        SELECT t.TaskID as id, t.EmployeeID as employee_id, t.Title as title,
               t.Description as description, t.Deadline as deadline, t.Status as status,
               t.CreatedAt as created_at, e.[Full Name] as employee_name, e.Email as employee_email
        FROM Tasks t
        LEFT JOIN Employees e ON t.EmployeeID = e.UserID
        WHERE t.TaskID = '${id.replace(/'/g, "''")}'
      `);
      
      if (!tasks || tasks.length === 0) {
        return res.status(500).json({ success: false, message: 'Failed to retrieve updated task' });
      }
      
      const task = tasks[0];
      res.json({
        success: true,
        data: {
          id: task.id,
          employee_id: task.employee_id,
          employee_name: task.employee_name || 'Unknown',
          employee_email: task.employee_email || '',
          title: task.title,
          description: task.description || '',
          deadline: task.deadline,
          status: task.status,
          created_at: task.created_at
        }
      });
    } catch (tableError) {
      console.error('❌ Tasks table error:', tableError);
      return res.status(500).json({ 
        success: false, 
        message: 'Tasks table not found. Please create the Tasks table in the database.',
        error: tableError.message 
      });
    }
  } catch (error) {
    console.error('❌ Update task error:', error);
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
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${dbPath}`);
  console.log(`\nTest endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/test`);
  console.log(`   GET http://localhost:${PORT}/api/health`);
  console.log(`   GET http://localhost:${PORT}/health\n`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process or use a different port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

