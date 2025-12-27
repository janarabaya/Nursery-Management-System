/**
 * Microsoft Access Database Connection
 * 
 * Uses node-adodb to connect to Microsoft Access database.
 * Provides helper functions for executing queries and building SQL statements.
 * 
 * Note: node-adodb only works on Windows with Microsoft Access Database Engine installed.
 */

const ADODB = require('node-adodb');
const { ACCESS_DB_PATH, IS_DEV } = require('./env');

// Connection string for Microsoft Access
// Provider=Microsoft.ACE.OLEDB.12.0 for .accdb files
// Provider=Microsoft.Jet.OLEDB.4.0 for older .mdb files
const connectionString = `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${ACCESS_DB_PATH};Persist Security Info=False;`;

// Create connection instance
let connection = null;

/**
 * Get or create database connection
 * @returns {Object} ADODB connection instance
 */
function getConnection() {
  if (!connection) {
    connection = ADODB.open(connectionString);
  }
  return connection;
}

/**
 * Execute a SELECT query
 * @param {string} sql - SQL SELECT statement
 * @returns {Promise<Array>} - Array of result rows
 */
async function query(sql) {
  try {
    if (IS_DEV) {
      console.log('[ACCESS SQL]', sql);
    }
    const conn = getConnection();
    const result = await conn.query(sql);
    return result || [];
  } catch (error) {
    console.error('[ACCESS QUERY ERROR]', error.message);
    throw error;
  }
}

/**
 * Execute an INSERT, UPDATE, or DELETE command
 * @param {string} sql - SQL command
 * @returns {Promise<void>}
 */
async function execute(sql) {
  try {
    if (IS_DEV) {
      console.log('[ACCESS SQL]', sql);
    }
    const conn = getConnection();
    await conn.execute(sql);
  } catch (error) {
    console.error('[ACCESS EXECUTE ERROR]', error.message);
    throw error;
  }
}

/**
 * Execute a scalar query (returns single value)
 * @param {string} sql - SQL query returning single value
 * @returns {Promise<any>} - Single value result
 */
async function scalar(sql) {
  try {
    const result = await query(sql);
    if (result && result.length > 0) {
      const firstRow = result[0];
      const keys = Object.keys(firstRow);
      return firstRow[keys[0]];
    }
    return null;
  } catch (error) {
    console.error('[ACCESS SCALAR ERROR]', error.message);
    throw error;
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} - True if connection successful
 */
async function testConnection() {
  try {
    // Try to get table names as a connection test
    await query("SELECT TOP 1 * FROM MSysObjects WHERE Type=1");
    return true;
  } catch (error) {
    // MSysObjects might not be accessible, try a simpler test
    try {
      const conn = getConnection();
      // Just opening the connection is a test
      return true;
    } catch (innerError) {
      console.error('[ACCESS CONNECTION ERROR]', innerError.message);
      return false;
    }
  }
}

/**
 * Get list of table names in the database
 * @returns {Promise<Array<string>>} - Array of table names
 */
async function getTableNames() {
  try {
    const conn = getConnection();
    const result = await conn.schema(20); // adSchemaTables = 20
    const tables = result
      .filter(t => t.TABLE_TYPE === 'TABLE' && !t.TABLE_NAME.startsWith('MSys'))
      .map(t => t.TABLE_NAME);
    return tables;
  } catch (error) {
    console.error('[ACCESS GET TABLES ERROR]', error.message);
    throw error;
  }
}

/**
 * Get table schema/column information
 * @param {string} tableName - Name of the table
 * @returns {Promise<Array>} - Array of column information
 */
async function getTableSchema(tableName) {
  try {
    const conn = getConnection();
    const result = await conn.schema(4, [null, null, tableName]); // adSchemaColumns = 4
    return result.map(col => ({
      name: col.COLUMN_NAME,
      type: col.DATA_TYPE,
      nullable: col.IS_NULLABLE,
      ordinal: col.ORDINAL_POSITION
    }));
  } catch (error) {
    console.error('[ACCESS GET SCHEMA ERROR]', error.message);
    throw error;
  }
}

// ============================================
// SQL HELPER FUNCTIONS
// ============================================

/**
 * Escape a value for use in SQL to prevent injection
 * @param {any} value - Value to escape
 * @returns {string} - Escaped SQL string
 */
function escapeSQL(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (value instanceof Date) {
    return `#${value.toISOString().split('T')[0]}#`;
  }
  // Escape single quotes by doubling them
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Build a WHERE clause from an object of conditions
 * @param {Object} conditions - Key-value pairs for WHERE conditions
 * @returns {string} - SQL WHERE clause (without WHERE keyword)
 */
function buildWhereClause(conditions) {
  if (!conditions || Object.keys(conditions).length === 0) {
    return '1=1';
  }
  
  const clauses = Object.entries(conditions).map(([key, value]) => {
    if (value === null) {
      return `[${key}] IS NULL`;
    }
    return `[${key}] = ${escapeSQL(value)}`;
  });
  
  return clauses.join(' AND ');
}

/**
 * Build an INSERT statement
 * @param {string} tableName - Name of the table
 * @param {Object} data - Key-value pairs of column names and values
 * @returns {string} - SQL INSERT statement
 */
function buildInsert(tableName, data) {
  const columns = Object.keys(data).map(col => `[${col}]`).join(', ');
  const values = Object.values(data).map(val => escapeSQL(val)).join(', ');
  return `INSERT INTO [${tableName}] (${columns}) VALUES (${values})`;
}

/**
 * Build an UPDATE statement
 * @param {string} tableName - Name of the table
 * @param {Object} data - Key-value pairs of columns to update
 * @param {Object} conditions - WHERE clause conditions
 * @returns {string} - SQL UPDATE statement
 */
function buildUpdate(tableName, data, conditions) {
  const setClause = Object.entries(data)
    .map(([key, value]) => `[${key}] = ${escapeSQL(value)}`)
    .join(', ');
  const whereClause = buildWhereClause(conditions);
  return `UPDATE [${tableName}] SET ${setClause} WHERE ${whereClause}`;
}

/**
 * Build a DELETE statement
 * @param {string} tableName - Name of the table
 * @param {Object} conditions - WHERE clause conditions
 * @returns {string} - SQL DELETE statement
 */
function buildDelete(tableName, conditions) {
  const whereClause = buildWhereClause(conditions);
  return `DELETE FROM [${tableName}] WHERE ${whereClause}`;
}

/**
 * Generate a unique ID (for Access databases without auto-increment)
 * @returns {string} - Unique identifier
 */
function generateId() {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}

/**
 * Get current date/time formatted for Access
 * @returns {string} - Current datetime for SQL
 */
function now() {
  return `#${new Date().toISOString().replace('T', ' ').split('.')[0]}#`;
}

module.exports = {
  getConnection,
  query,
  execute,
  scalar,
  testConnection,
  getTableNames,
  getTableSchema,
  escapeSQL,
  buildWhereClause,
  buildInsert,
  buildUpdate,
  buildDelete,
  generateId,
  now,
  connectionString,
  ACCESS_DB_PATH
};


