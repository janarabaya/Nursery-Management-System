/**
 * Plant Health Routes
 * 
 * GET /api/plant-health - Get all health logs (engineer)
 * POST /api/plant-health - Create health log (engineer)
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { engineerOnly, managerOrEngineer } = require('../middleware/roles');
const { ok, created, badRequest, notFound } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createHealthLogSchema = Joi.object({
  plant_id: Joi.number().required(),
  irrigation_liters: Joi.number().optional(),
  fertilization_notes: Joi.string().allow('', null).optional(),
  spraying_notes: Joi.string().allow('', null).optional(),
  disease_detected: Joi.string().allow('', null).optional(),
  diagnosis: Joi.string().allow('', null).optional(),
  recommendation: Joi.string().allow('', null).optional()
});

// ============================================
// GET /api/plant-health - Get all logs
// ============================================

router.get('/', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const logs = await db.query(`
    SELECT phl.ID as id, phl.PlantID as plant_id, phl.LoggedBy as logged_by,
           phl.IrrigationLiters as irrigation_liters,
           phl.FertilizationNotes as fertilization_notes,
           phl.SprayingNotes as spraying_notes,
           phl.DiseaseDetected as disease_detected,
           phl.Diagnosis as diagnosis,
           phl.Recommendation as recommendation,
           phl.LoggedAt as logged_at,
           p.Name as plant_name, p.ImageUrl as plant_image,
           u.FullName as logged_by_name
    FROM PlantHealthLogs phl
    LEFT JOIN Plants p ON phl.PlantID = p.ID
    LEFT JOIN Users u ON phl.LoggedBy = u.ID
    ORDER BY phl.LoggedAt DESC
  `);
  
  const formattedLogs = logs.map(log => ({
    id: log.id,
    plant_id: log.plant_id,
    logged_by: log.logged_by,
    irrigation_liters: log.irrigation_liters,
    fertilization_notes: log.fertilization_notes,
    spraying_notes: log.spraying_notes,
    disease_detected: log.disease_detected,
    diagnosis: log.diagnosis,
    recommendation: log.recommendation,
    logged_at: log.logged_at,
    plant: {
      id: log.plant_id,
      name: log.plant_name,
      image_url: log.plant_image
    },
    employee: {
      full_name: log.logged_by_name
    }
  }));
  
  ok(res, formattedLogs);
}));

// ============================================
// POST /api/plant-health - Create log
// ============================================

router.post('/', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { error, value } = createHealthLogSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const {
    plant_id,
    irrigation_liters,
    fertilization_notes,
    spraying_notes,
    disease_detected,
    diagnosis,
    recommendation
  } = value;
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  await db.execute(db.buildInsert('PlantHealthLogs', {
    PlantID: plant_id,
    LoggedBy: req.user.id,
    IrrigationLiters: irrigation_liters || null,
    FertilizationNotes: fertilization_notes || '',
    SprayingNotes: spraying_notes || '',
    DiseaseDetected: disease_detected || '',
    Diagnosis: diagnosis || '',
    Recommendation: recommendation || '',
    LoggedAt: new Date()
  }));
  
  // Get created log
  const logs = await db.query(`
    SELECT TOP 1 phl.ID as id, phl.PlantID as plant_id, phl.LoggedAt as logged_at,
           p.Name as plant_name
    FROM PlantHealthLogs phl
    LEFT JOIN Plants p ON phl.PlantID = p.ID
    WHERE phl.LoggedBy = ${db.escapeSQL(req.user.id)}
    ORDER BY phl.ID DESC
  `);
  
  created(res, {
    id: logs[0].id,
    plant_id: logs[0].plant_id,
    plant_name: logs[0].plant_name,
    logged_at: logs[0].logged_at,
    message: 'Health log created successfully'
  });
}));

module.exports = router;


