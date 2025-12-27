/**
 * Plants Routes
 * 
 * GET /api/plants - Get all active plants (public)
 * GET /api/plants/all - Get all plants including inactive (manager only)
 * GET /api/plants/:id - Get single plant
 * POST /api/plants - Create plant (manager only)
 * PUT /api/plants/:id - Update plant (manager only)
 * DELETE /api/plants/:id - Soft delete plant (manager only)
 * GET /api/plants/:id/health-status - Get plant health status
 * GET /api/plants/:id/inventory-status - Get plant inventory status
 * GET /api/plants/:id/health-issues - Get plant health issues
 * POST /api/plants/:id/health-issues - Create health issue
 * PUT /api/plants/:id/growth-stage - Update growth stage
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly, engineerOnly, staffOnly } = require('../middleware/roles');
const { ok, created, badRequest, notFound, serverError } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createPlantSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  description: Joi.string().required(),
  imageUrl: Joi.string().required(),
  category: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  isPopular: Joi.boolean().optional(),
  quantity: Joi.number().integer().min(0).optional(),
  latin_name: Joi.string().allow('', null).optional(),
  care_instructions: Joi.string().allow('', null).optional()
});

const updatePlantSchema = Joi.object({
  name: Joi.string().optional(),
  price: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  description: Joi.string().optional(),
  imageUrl: Joi.string().optional(),
  category: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  isPopular: Joi.boolean().optional(),
  quantity: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  latin_name: Joi.string().allow('', null).optional(),
  care_instructions: Joi.string().allow('', null).optional()
});

// ============================================
// GET /api/plants - Public: Get all active plants
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  
  let whereClause = 'IsActive = TRUE';
  
  if (category) {
    whereClause += ` AND Category LIKE '%${category.replace(/'/g, "''")}%'`;
  }
  
  if (search) {
    const searchEscaped = search.replace(/'/g, "''");
    whereClause += ` AND (Name LIKE '%${searchEscaped}%' OR Description LIKE '%${searchEscaped}%')`;
  }
  
  const plants = await db.query(`
    SELECT ID as id, Name as name, LatinName as latin_name, Category as category,
           Description as description, CareInstructions as care_instructions,
           BasePrice as base_price, SKU as sku, ImageUrl as image_url,
           IsPopular as is_popular, Quantity as quantity, IsActive as is_active,
           CreatedAt as created_at, UpdatedAt as updated_at
    FROM Plants
    WHERE ${whereClause}
    ORDER BY ID DESC
  `);
  
  // Format response for frontend
  const formattedPlants = plants.map(p => ({
    ...p,
    price: p.base_price ? `$${parseFloat(p.base_price).toFixed(2)}` : '$0.00',
    imageUrl: p.image_url,
    isPopular: Boolean(p.is_popular)
  }));
  
  ok(res, formattedPlants);
}));

// ============================================
// GET /api/plants/all - Manager: Get all plants
// ============================================

router.get('/all', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const plants = await db.query(`
    SELECT ID as id, Name as name, LatinName as latin_name, Category as category,
           Description as description, CareInstructions as care_instructions,
           BasePrice as base_price, SKU as sku, ImageUrl as image_url,
           IsPopular as is_popular, Quantity as quantity, IsActive as is_active,
           CreatedAt as created_at, UpdatedAt as updated_at
    FROM Plants
    ORDER BY ID DESC
  `);
  
  const formattedPlants = plants.map(p => ({
    ...p,
    price: p.base_price ? `$${parseFloat(p.base_price).toFixed(2)}` : '$0.00',
    imageUrl: p.image_url,
    isPopular: Boolean(p.is_popular),
    isActive: Boolean(p.is_active)
  }));
  
  ok(res, formattedPlants);
}));

// ============================================
// GET /api/plants/:id - Get single plant
// ============================================

router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const plants = await db.query(`
    SELECT ID as id, Name as name, LatinName as latin_name, Category as category,
           Description as description, CareInstructions as care_instructions,
           BasePrice as base_price, SKU as sku, ImageUrl as image_url,
           IsPopular as is_popular, Quantity as quantity, IsActive as is_active,
           CreatedAt as created_at, UpdatedAt as updated_at
    FROM Plants
    WHERE ID = ${db.escapeSQL(id)}
  `);
  
  if (!plants || plants.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  const plant = plants[0];
  ok(res, {
    ...plant,
    price: plant.base_price ? `$${parseFloat(plant.base_price).toFixed(2)}` : '$0.00',
    imageUrl: plant.image_url,
    isPopular: Boolean(plant.is_popular),
    isActive: Boolean(plant.is_active)
  });
}));

// ============================================
// POST /api/plants - Manager: Create plant
// ============================================

router.post('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { error, value } = createPlantSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { name, price, description, imageUrl, category, isPopular, quantity, latin_name, care_instructions } = value;
  
  // Parse price (remove currency symbols if present)
  const priceValue = typeof price === 'string' 
    ? parseFloat(price.replace(/[^\d.]/g, '')) 
    : parseFloat(price);
  
  // Convert category array to comma-separated string
  const categoryStr = Array.isArray(category) ? category.join(',') : (category || 'other');
  
  // Generate SKU
  const sku = `PLANT-${Date.now()}`;
  
  await db.execute(db.buildInsert('Plants', {
    Name: name,
    LatinName: latin_name || '',
    Category: categoryStr,
    Description: description,
    CareInstructions: care_instructions || '',
    BasePrice: priceValue,
    SKU: sku,
    ImageUrl: imageUrl,
    IsPopular: isPopular ? true : false,
    Quantity: quantity || 0,
    IsActive: true,
    CreatedAt: new Date(),
    UpdatedAt: new Date()
  }));
  
  // Fetch the created plant
  const createdPlants = await db.query(`
    SELECT ID as id, Name as name, BasePrice as base_price, Description as description,
           ImageUrl as image_url, Category as category, IsPopular as is_popular,
           Quantity as quantity, IsActive as is_active, SKU as sku
    FROM Plants WHERE SKU = ${db.escapeSQL(sku)}
  `);
  
  const plant = createdPlants[0];
  created(res, {
    ...plant,
    price: plant.base_price ? `$${parseFloat(plant.base_price).toFixed(2)}` : '$0.00',
    imageUrl: plant.image_url,
    isPopular: Boolean(plant.is_popular)
  });
}));

// ============================================
// PUT /api/plants/:id - Manager: Update plant
// ============================================

router.put('/:id', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { error, value } = updatePlantSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Check if plant exists
  const existing = await db.query(`SELECT ID FROM Plants WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Build update data
  const updateData = {};
  
  if (value.name) updateData.Name = value.name;
  if (value.price) {
    const priceValue = typeof value.price === 'string' 
      ? parseFloat(value.price.replace(/[^\d.]/g, '')) 
      : parseFloat(value.price);
    updateData.BasePrice = priceValue;
  }
  if (value.description) updateData.Description = value.description;
  if (value.imageUrl) updateData.ImageUrl = value.imageUrl;
  if (value.category) {
    updateData.Category = Array.isArray(value.category) ? value.category.join(',') : value.category;
  }
  if (value.isPopular !== undefined) updateData.IsPopular = value.isPopular;
  if (value.quantity !== undefined) updateData.Quantity = value.quantity;
  if (value.isActive !== undefined) updateData.IsActive = value.isActive;
  if (value.latin_name !== undefined) updateData.LatinName = value.latin_name;
  if (value.care_instructions !== undefined) updateData.CareInstructions = value.care_instructions;
  
  updateData.UpdatedAt = new Date();
  
  if (Object.keys(updateData).length === 1) { // Only UpdatedAt
    return badRequest(res, 'No fields to update');
  }
  
  await db.execute(db.buildUpdate('Plants', updateData, { ID: id }));
  
  // Fetch updated plant
  const updated = await db.query(`
    SELECT ID as id, Name as name, BasePrice as base_price, Description as description,
           ImageUrl as image_url, Category as category, IsPopular as is_popular,
           Quantity as quantity, IsActive as is_active
    FROM Plants WHERE ID = ${db.escapeSQL(id)}
  `);
  
  const plant = updated[0];
  ok(res, {
    ...plant,
    price: plant.base_price ? `$${parseFloat(plant.base_price).toFixed(2)}` : '$0.00',
    imageUrl: plant.image_url,
    isPopular: Boolean(plant.is_popular),
    isActive: Boolean(plant.is_active)
  });
}));

// ============================================
// DELETE /api/plants/:id - Manager: Soft delete
// ============================================

router.delete('/:id', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const existing = await db.query(`SELECT ID FROM Plants WHERE ID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  await db.execute(db.buildUpdate('Plants', { IsActive: false, UpdatedAt: new Date() }, { ID: id }));
  
  ok(res, { message: 'Plant deactivated successfully' });
}));

// ============================================
// GET /api/plants/:id/health-status - Engineer: Get health status
// ============================================

router.get('/:id/health-status', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get latest health log for the plant
  const healthLogs = await db.query(`
    SELECT TOP 1 *
    FROM PlantHealthLogs
    WHERE PlantID = ${db.escapeSQL(id)}
    ORDER BY LoggedAt DESC
  `);
  
  const plant = await db.query(`SELECT Name, Quantity FROM Plants WHERE ID = ${db.escapeSQL(id)}`);
  
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  const latestLog = healthLogs[0];
  
  ok(res, {
    plant_id: id,
    plant_name: plant[0].Name,
    health_status: latestLog ? (latestLog.DiseaseDetected ? 'needs_attention' : 'healthy') : 'unknown',
    last_inspection: latestLog ? latestLog.LoggedAt : null,
    disease_detected: latestLog ? latestLog.DiseaseDetected : null,
    recommendation: latestLog ? latestLog.Recommendation : null
  });
}));

// ============================================
// GET /api/plants/:id/inventory-status
// ============================================

router.get('/:id/inventory-status', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const items = await db.query(`
    SELECT SUM(QuantityOnHand) as total_quantity, 
           MIN(ReorderLevel) as reorder_level
    FROM InventoryItems
    WHERE PlantID = ${db.escapeSQL(id)}
  `);
  
  const plant = await db.query(`SELECT Quantity FROM Plants WHERE ID = ${db.escapeSQL(id)}`);
  
  ok(res, {
    plant_id: id,
    quantity_on_hand: items[0]?.total_quantity || plant[0]?.Quantity || 0,
    reorder_level: items[0]?.reorder_level || 10,
    status: (items[0]?.total_quantity || 0) <= (items[0]?.reorder_level || 10) ? 'low' : 'ok'
  });
}));

// ============================================
// GET /api/plants/:id/health-issues
// ============================================

router.get('/:id/health-issues', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const issues = await db.query(`
    SELECT ID as id, DiseaseDetected as type, Diagnosis as description,
           LoggedAt as date, Recommendation as recommendation
    FROM PlantHealthLogs
    WHERE PlantID = ${db.escapeSQL(id)} AND DiseaseDetected IS NOT NULL
    ORDER BY LoggedAt DESC
  `);
  
  ok(res, issues);
}));

// ============================================
// POST /api/plants/:id/health-issues
// ============================================

router.post('/:id/health-issues', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, description, status } = req.body;
  
  await db.execute(db.buildInsert('PlantHealthLogs', {
    PlantID: id,
    LoggedBy: req.user.id,
    DiseaseDetected: type || 'issue',
    Diagnosis: description,
    Recommendation: status || 'active',
    LoggedAt: new Date()
  }));
  
  created(res, { message: 'Health issue created' });
}));

// ============================================
// PUT /api/plants/:id/growth-stage
// ============================================

router.put('/:id/growth-stage', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { growthStage } = req.body;
  
  // Store growth stage in a custom field or log
  // For now, we'll update a description field
  await db.execute(db.buildUpdate('Plants', { 
    CareInstructions: `Growth Stage: ${growthStage}`,
    UpdatedAt: new Date() 
  }, { ID: id }));
  
  ok(res, { message: 'Growth stage updated', growthStage });
}));

module.exports = router;


