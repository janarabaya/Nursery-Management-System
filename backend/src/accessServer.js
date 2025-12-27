/**
 * Access Database Utility Server
 * 
 * Separate Express server for generic Access database operations.
 * Runs on port 4000 (configurable via ACCESS_DB_PORT env variable).
 * 
 * This server provides direct table access endpoints used by
 * some frontend components (SimplePlantManagement, Plants pages).
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Load environment config
const { ACCESS_DB_PORT, IS_DEV, FRONTEND_URL, ACCESS_DB_PATH } = require('./config/env');
const db = require('./config/accessDb');
const dbAccessRoutes = require('./routes/dbAccess');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Create Express app
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow requests from React frontend
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging in development
if (IS_DEV) {
  app.use(morgan('dev'));
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'Microsoft Access',
    dbPath: ACCESS_DB_PATH,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// API ROUTES
// ============================================

// Mount database access routes
app.use('/api/db', dbAccessRoutes);

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

async function startServer() {
  // Test database connection
  console.log('\n🔌 Testing database connection...');
  const connected = await db.testConnection();
  
  if (connected) {
    console.log('✅ Database connection successful');
    
    // Try to get table names
    try {
      const tables = await db.getTableNames();
      console.log(`📊 Found ${tables.length} tables:`, tables.slice(0, 5).join(', '), tables.length > 5 ? '...' : '');
    } catch (error) {
      console.log('⚠️  Could not fetch table names');
    }
  } else {
    console.log('⚠️  Database connection failed - server will start but some features may not work');
  }
  
  // Start listening
  app.listen(ACCESS_DB_PORT, () => {
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`🗄️  Access Database Utility Server`);
    console.log('═══════════════════════════════════════════════════');
    console.log(`   URL:         http://localhost:${ACCESS_DB_PORT}`);
    console.log(`   Database:    ${ACCESS_DB_PATH}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📋 Available API Routes:');
    console.log('   GET    /api/db/info');
    console.log('   GET    /api/db/table/:tableName');
    console.log('   GET    /api/db/table/:tableName/schema');
    console.log('   GET    /api/db/table/:tableName/data');
    console.log('   POST   /api/db/table/:tableName/insert');
    console.log('   PUT    /api/db/table/:tableName/update');
    console.log('   DELETE /api/db/table/:tableName/delete');
    console.log('   POST   /api/db/query');
    console.log('   GET    /health');
    console.log('\n✅ Server is ready to accept requests\n');
  });
}

// Start the server
startServer().catch(err => {
  console.error('Failed to start Access DB server:', err);
  process.exit(1);
});

module.exports = app;


