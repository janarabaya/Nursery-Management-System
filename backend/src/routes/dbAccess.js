/**
 * Database Access Routes (Generic Access DB Operations)
 * 
 * These routes provide direct access to the Access database tables.
 * Used by frontend components for generic CRUD operations.
 * 
 * GET /api/db/info - Get database info and table names
 * GET /api/db/table/:tableName - Get all data from table
 * GET /api/db/table/:tableName/schema - Get table schema
 * GET /api/db/table/:tableName/data - Get data with pagination
 * POST /api/db/table/:tableName/insert - Insert data
 * PUT /api/db/table/:tableName/update - Update data
 * DELETE /api/db/table/:tableName/delete - Delete data
 * POST /api/db/query - Execute custom query
 */

const express = require('express');
const db = require('../config/accessDb');
const { ok, created, badRequest, serverError } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// GET /api/db/info - Get database info
// ============================================

router.get('/info', asyncHandler(async (req, res) => {
  try {
    const tables = await db.getTableNames();
    
    res.json({
      success: true,
      tables: tables,
      count: tables.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// ============================================
// GET /api/db/table/:tableName - Get all table data
// ============================================

router.get('/table/:tableName', asyncHandler(async (req, res) => {
  try {
    const { tableName } = req.params;
    const sql = `SELECT * FROM [${tableName.replace(/[\[\]]/g, '')}]`;
    const data = await db.query(sql);
    
    res.json({
      success: true,
      table: tableName,
      data: data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// ============================================
// GET /api/db/table/:tableName/schema - Get schema
// ============================================

router.get('/table/:tableName/schema', asyncHandler(async (req, res) => {
  try {
    const { tableName } = req.params;
    const schema = await db.getTableSchema(tableName);
    
    res.json({
      success: true,
      table: tableName,
      schema: schema
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// ============================================
// GET /api/db/table/:tableName/data - Get with pagination
// ============================================

router.get('/table/:tableName/data', asyncHandler(async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Access uses TOP instead of LIMIT/OFFSET
    const sql = `SELECT TOP ${parseInt(limit)} * FROM [${tableName.replace(/[\[\]]/g, '')}]`;
    const data = await db.query(sql);
    
    res.json({
      success: true,
      table: tableName,
      data: data,
      count: data.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// ============================================
// POST /api/db/table/:tableName/insert - Insert data
// ============================================

router.post('/table/:tableName/insert', asyncHandler(async (req, res) => {
  try {
    const { tableName } = req.params;
    const { data } = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Data object is required'
      });
    }
    
    const sql = db.buildInsert(tableName.replace(/[\[\]]/g, ''), data);
    await db.execute(sql);
    
    res.json({
      success: true,
      message: 'Data inserted successfully',
      table: tableName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// ============================================
// PUT /api/db/table/:tableName/update - Update data
// ============================================

router.put('/table/:tableName/update', asyncHandler(async (req, res) => {
  try {
    const { tableName } = req.params;
    const { where, data } = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Data object is required'
      });
    }
    
    if (!where || typeof where !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Where clause is required'
      });
    }
    
    const sql = db.buildUpdate(tableName.replace(/[\[\]]/g, ''), data, where);
    await db.execute(sql);
    
    res.json({
      success: true,
      message: 'Data updated successfully',
      table: tableName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// ============================================
// DELETE /api/db/table/:tableName/delete - Delete data
// ============================================

router.delete('/table/:tableName/delete', asyncHandler(async (req, res) => {
  try {
    const { tableName } = req.params;
    const { where } = req.body;
    
    if (!where || typeof where !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Where clause is required'
      });
    }
    
    const sql = db.buildDelete(tableName.replace(/[\[\]]/g, ''), where);
    await db.execute(sql);
    
    res.json({
      success: true,
      message: 'Data deleted successfully',
      table: tableName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// ============================================
// POST /api/db/query - Execute custom query
// ============================================

router.post('/query', asyncHandler(async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    // Only allow SELECT queries for safety
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return res.status(400).json({
        success: false,
        error: 'Only SELECT queries are allowed through this endpoint'
      });
    }
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

module.exports = router;


