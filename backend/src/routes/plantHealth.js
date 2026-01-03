/**
 * Plant Health Routes
 * 
 * GET /api/plant-health - Get all health logs (engineer)
 * POST /api/plant-health - Create health log (engineer)
 * PUT /api/plant-health/:id/status - Update plant health status (engineer)
 * GET /api/plant-health/plants/:plant_id/diseases - Get disease/pest records for plant
 * POST /api/plant-health/plants/:plant_id/diseases - Record disease/pest (engineer)
 * PUT /api/plant-health/diseases/:id/treatment - Record treatment for disease/pest (engineer)
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
  health_status: Joi.string().valid('healthy', 'needs_irrigation', 'needs_fertilization', 'diseased').optional(),
  irrigation_liters: Joi.number().optional(),
  fertilization_notes: Joi.string().allow('', null).optional(),
  spraying_notes: Joi.string().allow('', null).optional(),
  disease_detected: Joi.string().allow('', null).optional(),
  diagnosis: Joi.string().allow('', null).optional(),
  recommendation: Joi.string().allow('', null).optional()
});

const updateHealthStatusSchema = Joi.object({
  health_status: Joi.string().valid('healthy', 'needs_irrigation', 'needs_fertilization', 'diseased').required()
});

const createDiseaseRecordSchema = Joi.object({
  type: Joi.string().valid('disease', 'pest').required(),
  name: Joi.string().required(),
  symptoms: Joi.string().required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  description: Joi.string().allow('', null).optional()
});

const recordTreatmentSchema = Joi.object({
  treatment_type: Joi.string().required(),
  treatment_details: Joi.string().required(),
  treatment_date: Joi.date().optional()
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
  
  // Build health log data
  const logData = {
    PlantID: plant_id,
    LoggedBy: req.user.id,
    IrrigationLiters: irrigation_liters || null,
    FertilizationNotes: fertilization_notes || '',
    SprayingNotes: spraying_notes || '',
    DiseaseDetected: disease_detected || '',
    Diagnosis: diagnosis || '',
    Recommendation: recommendation || '',
    LoggedAt: new Date()
  };
  
  // If health_status provided, include it in diagnosis
  if (value.health_status) {
    logData.Diagnosis = (diagnosis || '') + ` [Health Status: ${value.health_status}]`.trim();
  }
  
  await db.execute(db.buildInsert('PlantHealthLogs', logData));
  
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

// ============================================
// PUT /api/plant-health/:id/status - Engineer: Update plant health status
// ============================================

router.put('/:id/status', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { id } = req.params; // plant_id
  
  const { error, value } = updateHealthStatusSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name FROM Plants WHERE ID = ${db.escapeSQL(id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Create health log with status update
  await db.execute(db.buildInsert('PlantHealthLogs', {
    PlantID: id,
    LoggedBy: req.user.id,
    Diagnosis: `Health Status Updated: ${value.health_status}`,
    Recommendation: `Current status: ${value.health_status}`,
    LoggedAt: new Date()
  }));
  
  ok(res, {
    message: 'Health status updated successfully',
    plant_id: id,
    plant_name: plant[0].Name,
    health_status: value.health_status
  });
}));

// ============================================
// GET /api/plant-health/plants/:plant_id/diseases - Get disease/pest records
// ============================================

router.get('/plants/:plant_id/diseases', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  // Get all disease/pest records for the plant
  const diseases = await db.query(`
    SELECT phl.ID as id, phl.PlantID as plant_id, phl.DiseaseDetected as name,
           phl.Diagnosis as symptoms, phl.SprayingNotes as treatment_details,
           phl.LoggedAt as detected_date, phl.Recommendation as severity,
           p.Name as plant_name
    FROM PlantHealthLogs phl
    LEFT JOIN Plants p ON phl.PlantID = p.ID
    WHERE phl.PlantID = ${db.escapeSQL(plant_id)} 
      AND phl.DiseaseDetected IS NOT NULL 
      AND phl.DiseaseDetected <> ''
    ORDER BY phl.LoggedAt DESC
  `);
  
  // Format response
  const formatted = diseases.map(d => ({
    id: d.id,
    plant_id: d.plant_id,
    plant_name: d.plant_name,
    type: d.name.toLowerCase().includes('pest') ? 'pest' : 'disease',
    name: d.name,
    symptoms: d.symptoms || '',
    severity: d.severity || 'medium',
    treatment_details: d.treatment_details || null,
    detected_date: d.detected_date,
    treated: d.treatment_details ? true : false
  }));
  
  ok(res, formatted);
}));

// ============================================
// POST /api/plant-health/plants/:plant_id/diseases - Record disease/pest
// ============================================

router.post('/plants/:plant_id/diseases', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  const { error, value } = createDiseaseRecordSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Create health log for disease/pest
  await db.execute(db.buildInsert('PlantHealthLogs', {
    PlantID: plant_id,
    LoggedBy: req.user.id,
    DiseaseDetected: value.name,
    Diagnosis: `Symptoms: ${value.symptoms}. ${value.description || ''}`.trim(),
    Recommendation: `Severity: ${value.severity}. Type: ${value.type}`,
    LoggedAt: new Date()
  }));
  
  // Get created record
  const logs = await db.query(`
    SELECT TOP 1 phl.ID as id, phl.PlantID as plant_id, phl.DiseaseDetected as name,
           phl.Diagnosis as symptoms, phl.LoggedAt as detected_date
    FROM PlantHealthLogs phl
    WHERE phl.PlantID = ${db.escapeSQL(plant_id)} AND phl.LoggedBy = ${db.escapeSQL(req.user.id)}
    ORDER BY phl.ID DESC
  `);
  
  created(res, {
    id: logs[0].id,
    plant_id: logs[0].plant_id,
    type: value.type,
    name: logs[0].name,
    symptoms: logs[0].symptoms,
    severity: value.severity,
    detected_date: logs[0].detected_date,
    message: 'Disease/pest record created successfully'
  });
}));

// ============================================
// PUT /api/plant-health/diseases/:id/treatment - Record treatment
// ============================================

router.put('/diseases/:id/treatment', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { id } = req.params; // health log ID
  
  const { error, value } = recordTreatmentSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Verify health log exists
  const log = await db.query(`SELECT ID, PlantID FROM PlantHealthLogs WHERE ID = ${db.escapeSQL(id)}`);
  if (!log || log.length === 0) {
    return notFound(res, 'Disease/pest record not found');
  }
  
  // Update health log with treatment details
  const treatmentDate = value.treatment_date || new Date();
  await db.execute(db.buildUpdate('PlantHealthLogs', {
    SprayingNotes: `Treatment Type: ${value.treatment_type}. Details: ${value.treatment_details}. Date: ${treatmentDate}`,
    Recommendation: (await db.query(`SELECT Recommendation FROM PlantHealthLogs WHERE ID = ${db.escapeSQL(id)}`))[0]?.Recommendation + ' [TREATED]' || '[TREATED]'
  }, { ID: id }));
  
  ok(res, {
    message: 'Treatment recorded successfully',
    id: id,
    plant_id: log[0].PlantID,
    treatment_type: value.treatment_type,
    treatment_date: treatmentDate
  });
}));

module.exports = router;


