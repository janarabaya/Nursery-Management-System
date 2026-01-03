/**
 * Agricultural Management Routes
 * 
 * Irrigation Management:
 * GET /api/agricultural/irrigation/plants/:plant_id - Get irrigation schedule for plant
 * POST /api/agricultural/irrigation/plants/:plant_id - Set irrigation schedule
 * PUT /api/agricultural/irrigation/plants/:plant_id/record - Record irrigation event
 * GET /api/agricultural/irrigation/alerts - Get irrigation alerts (overdue)
 * 
 * Fertilization Management:
 * GET /api/agricultural/fertilization/plants/:plant_id - Get fertilization schedule/history
 * POST /api/agricultural/fertilization/plants/:plant_id - Set fertilization schedule
 * PUT /api/agricultural/fertilization/plants/:plant_id/record - Record fertilization event
 * GET /api/agricultural/fertilization/history/:plant_id - Get fertilization history
 * 
 * Technical Notes:
 * GET /api/agricultural/plants/:plant_id/notes - Get technical notes
 * POST /api/agricultural/plants/:plant_id/notes - Add technical note/recommendation
 * 
 * Supply Requests:
 * GET /api/agricultural/supply-requests - Get all supply requests (engineer)
 * POST /api/agricultural/supply-requests - Create supply request (engineer)
 * GET /api/agricultural/supply-requests/:id - Get single supply request
 * PUT /api/agricultural/supply-requests/:id/status - Update request status (manager)
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { managerOrEngineer, engineerOnly } = require('../middleware/roles');
const { ok, created, badRequest, notFound } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const irrigationScheduleSchema = Joi.object({
  frequency_days: Joi.number().integer().min(1).required(),
  last_irrigation_date: Joi.date().optional(),
  notes: Joi.string().allow('', null).optional()
});

const recordIrrigationSchema = Joi.object({
  liters: Joi.number().min(0).required(),
  irrigation_date: Joi.date().optional(),
  notes: Joi.string().allow('', null).optional()
});

const fertilizationScheduleSchema = Joi.object({
  fertilizer_type: Joi.string().required(),
  dosage: Joi.string().required(),
  frequency_days: Joi.number().integer().min(1).required(),
  last_fertilization_date: Joi.date().optional(),
  notes: Joi.string().allow('', null).optional()
});

const recordFertilizationSchema = Joi.object({
  fertilizer_type: Joi.string().required(),
  dosage: Joi.string().required(),
  fertilization_date: Joi.date().optional(),
  notes: Joi.string().allow('', null).optional()
});

const technicalNoteSchema = Joi.object({
  note: Joi.string().required(),
  type: Joi.string().valid('note', 'recommendation', 'observation').optional()
});

const createSupplyRequestSchema = Joi.object({
  item_type: Joi.string().valid('fertilizer', 'pesticide', 'tool', 'equipment', 'other').required(),
  item_name: Joi.string().required(),
  quantity: Joi.string().required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  reason: Joi.string().required(),
  requested_date: Joi.date().optional()
});

const updateRequestStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected', 'fulfilled').required(),
  notes: Joi.string().allow('', null).optional()
});

// ============================================
// IRRIGATION ROUTES
// ============================================

// GET /api/agricultural/irrigation/plants/:plant_id - Get irrigation schedule
router.get('/irrigation/plants/:plant_id', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Get latest irrigation record from health logs
  const irrigationLogs = await db.query(`
    SELECT TOP 1 phl.ID as id, phl.IrrigationLiters as liters, phl.LoggedAt as last_irrigation,
           phl.FertilizationNotes as notes
    FROM PlantHealthLogs phl
    WHERE phl.PlantID = ${db.escapeSQL(plant_id)} AND phl.IrrigationLiters IS NOT NULL
    ORDER BY phl.LoggedAt DESC
  `);
  
  // Get irrigation schedule from CareInstructions or default
  const plantData = await db.query(`SELECT CareInstructions FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  const careInstructions = plantData[0]?.CareInstructions || '';
  
  // Parse frequency from care instructions (format: "Irrigation Frequency: X days")
  let frequencyDays = 7; // default
  const freqMatch = careInstructions.match(/Irrigation Frequency:\s*(\d+)\s*days?/i);
  if (freqMatch) {
    frequencyDays = parseInt(freqMatch[1]);
  }
  
  const latestLog = irrigationLogs[0];
  const lastIrrigation = latestLog ? new Date(latestLog.last_irrigation) : null;
  
  // Calculate next irrigation date
  let nextIrrigation = null;
  if (lastIrrigation) {
    nextIrrigation = new Date(lastIrrigation);
    nextIrrigation.setDate(nextIrrigation.getDate() + frequencyDays);
  }
  
  // Check if overdue
  const isOverdue = nextIrrigation ? new Date() > nextIrrigation : false;
  
  ok(res, {
    plant_id: plant_id,
    plant_name: plant[0].Name,
    frequency_days: frequencyDays,
    last_irrigation_date: lastIrrigation,
    last_irrigation_liters: latestLog?.liters || null,
    next_irrigation_date: nextIrrigation,
    is_overdue: isOverdue,
    notes: latestLog?.notes || null
  });
}));

// POST /api/agricultural/irrigation/plants/:plant_id - Set irrigation schedule
router.post('/irrigation/plants/:plant_id', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  const { error, value } = irrigationScheduleSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name, CareInstructions FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Update CareInstructions with irrigation schedule
  let careInstructions = plant[0].CareInstructions || '';
  // Remove old irrigation frequency
  careInstructions = careInstructions.replace(/Irrigation Frequency:\s*\d+\s*days?/gi, '').trim();
  // Add new frequency
  careInstructions = `${careInstructions}\nIrrigation Frequency: ${value.frequency_days} days`.trim();
  if (value.notes) {
    careInstructions = `${careInstructions}\nIrrigation Notes: ${value.notes}`.trim();
  }
  
  await db.execute(db.buildUpdate('Plants', {
    CareInstructions: careInstructions,
    UpdatedAt: new Date()
  }, { ID: plant_id }));
  
  // If last_irrigation_date provided, create a log entry
  if (value.last_irrigation_date) {
    await db.execute(db.buildInsert('PlantHealthLogs', {
      PlantID: plant_id,
      LoggedBy: req.user.id,
      IrrigationLiters: 0, // Will be updated when actual irrigation is recorded
      LoggedAt: value.last_irrigation_date
    }));
  }
  
  ok(res, {
    message: 'Irrigation schedule set successfully',
    plant_id: plant_id,
    frequency_days: value.frequency_days,
    last_irrigation_date: value.last_irrigation_date || null
  });
}));

// PUT /api/agricultural/irrigation/plants/:plant_id/record - Record irrigation
router.put('/irrigation/plants/:plant_id/record', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  const { error, value } = recordIrrigationSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Create health log for irrigation
  const irrigationDate = value.irrigation_date || new Date();
  await db.execute(db.buildInsert('PlantHealthLogs', {
    PlantID: plant_id,
    LoggedBy: req.user.id,
    IrrigationLiters: value.liters,
    FertilizationNotes: value.notes || '',
    LoggedAt: irrigationDate
  }));
  
  created(res, {
    message: 'Irrigation recorded successfully',
    plant_id: plant_id,
    plant_name: plant[0].Name,
    liters: value.liters,
    irrigation_date: irrigationDate
  });
}));

// GET /api/agricultural/irrigation/alerts - Get irrigation alerts
router.get('/irrigation/alerts', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  // Get all plants with irrigation schedules and check for overdue
  const plants = await db.query(`
    SELECT p.ID as plant_id, p.Name as plant_name, p.CareInstructions
    FROM Plants p
    WHERE p.IsActive = TRUE AND p.CareInstructions LIKE '%Irrigation Frequency%'
  `);
  
  const alerts = [];
  
  for (const plant of plants) {
    const careInstructions = plant.CareInstructions || '';
    const freqMatch = careInstructions.match(/Irrigation Frequency:\s*(\d+)\s*days?/i);
    if (!freqMatch) continue;
    
    const frequencyDays = parseInt(freqMatch[1]);
    
    // Get last irrigation
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
        alerts.push({
          plant_id: plant.plant_id,
          plant_name: plant.plant_name,
          last_irrigation_date: lastIrrigation,
          next_irrigation_date: nextIrrigation,
          days_overdue: daysOverdue,
          frequency_days: frequencyDays
        });
      }
    }
  }
  
  ok(res, {
    alerts: alerts,
    count: alerts.length
  });
}));

// ============================================
// FERTILIZATION ROUTES
// ============================================

// GET /api/agricultural/fertilization/plants/:plant_id - Get fertilization schedule
router.get('/fertilization/plants/:plant_id', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Get latest fertilization from health logs
  const fertLogs = await db.query(`
    SELECT TOP 1 phl.FertilizationNotes as notes, phl.LoggedAt as last_fertilization
    FROM PlantHealthLogs phl
    WHERE phl.PlantID = ${db.escapeSQL(plant_id)} 
      AND phl.FertilizationNotes IS NOT NULL 
      AND phl.FertilizationNotes <> ''
      AND phl.FertilizationNotes NOT LIKE '%Irrigation%'
    ORDER BY phl.LoggedAt DESC
  `);
  
  // Get schedule from CareInstructions
  const plantData = await db.query(`SELECT CareInstructions FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  const careInstructions = plantData[0]?.CareInstructions || '';
  
  // Parse fertilization info from care instructions
  let fertilizerType = null;
  let dosage = null;
  let frequencyDays = null;
  
  const fertMatch = careInstructions.match(/Fertilization:\s*([^,]+),\s*Dosage:\s*([^,]+),\s*Frequency:\s*(\d+)\s*days?/i);
  if (fertMatch) {
    fertilizerType = fertMatch[1].trim();
    dosage = fertMatch[2].trim();
    frequencyDays = parseInt(fertMatch[3]);
  }
  
  const latestLog = fertLogs[0];
  const lastFertilization = latestLog ? new Date(latestLog.last_fertilization) : null;
  
  let nextFertilization = null;
  if (lastFertilization && frequencyDays) {
    nextFertilization = new Date(lastFertilization);
    nextFertilization.setDate(nextFertilization.getDate() + frequencyDays);
  }
  
  ok(res, {
    plant_id: plant_id,
    plant_name: plant[0].Name,
    fertilizer_type: fertilizerType,
    dosage: dosage,
    frequency_days: frequencyDays,
    last_fertilization_date: lastFertilization,
    next_fertilization_date: nextFertilization,
    notes: latestLog?.notes || null
  });
}));

// POST /api/agricultural/fertilization/plants/:plant_id - Set fertilization schedule
router.post('/fertilization/plants/:plant_id', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  const { error, value } = fertilizationScheduleSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name, CareInstructions FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Update CareInstructions with fertilization schedule
  let careInstructions = plant[0].CareInstructions || '';
  // Remove old fertilization schedule
  careInstructions = careInstructions.replace(/Fertilization:\s*[^,]+,\s*Dosage:\s*[^,]+,\s*Frequency:\s*\d+\s*days?/gi, '').trim();
  // Add new schedule
  careInstructions = `${careInstructions}\nFertilization: ${value.fertilizer_type}, Dosage: ${value.dosage}, Frequency: ${value.frequency_days} days`.trim();
  if (value.notes) {
    careInstructions = `${careInstructions}\nFertilization Notes: ${value.notes}`.trim();
  }
  
  await db.execute(db.buildUpdate('Plants', {
    CareInstructions: careInstructions,
    UpdatedAt: new Date()
  }, { ID: plant_id }));
  
  // If last_fertilization_date provided, create a log entry
  if (value.last_fertilization_date) {
    await db.execute(db.buildInsert('PlantHealthLogs', {
      PlantID: plant_id,
      LoggedBy: req.user.id,
      FertilizationNotes: `Type: ${value.fertilizer_type}, Dosage: ${value.dosage}`,
      LoggedAt: value.last_fertilization_date
    }));
  }
  
  ok(res, {
    message: 'Fertilization schedule set successfully',
    plant_id: plant_id,
    fertilizer_type: value.fertilizer_type,
    dosage: value.dosage,
    frequency_days: value.frequency_days
  });
}));

// PUT /api/agricultural/fertilization/plants/:plant_id/record - Record fertilization
router.put('/fertilization/plants/:plant_id/record', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  const { error, value } = recordFertilizationSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Create health log for fertilization
  const fertDate = value.fertilization_date || new Date();
  const notes = `Type: ${value.fertilizer_type}, Dosage: ${value.dosage}${value.notes ? '. Notes: ' + value.notes : ''}`;
  
  await db.execute(db.buildInsert('PlantHealthLogs', {
    PlantID: plant_id,
    LoggedBy: req.user.id,
    FertilizationNotes: notes,
    LoggedAt: fertDate
  }));
  
  created(res, {
    message: 'Fertilization recorded successfully',
    plant_id: plant_id,
    plant_name: plant[0].Name,
    fertilizer_type: value.fertilizer_type,
    dosage: value.dosage,
    fertilization_date: fertDate
  });
}));

// GET /api/agricultural/fertilization/history/:plant_id - Get fertilization history
router.get('/fertilization/history/:plant_id', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Get all fertilization records
  const history = await db.query(`
    SELECT phl.ID as id, phl.FertilizationNotes as notes, phl.LoggedAt as date,
           u.FullName as logged_by_name
    FROM PlantHealthLogs phl
    LEFT JOIN Users u ON phl.LoggedBy = u.ID
    WHERE phl.PlantID = ${db.escapeSQL(plant_id)}
      AND phl.FertilizationNotes IS NOT NULL
      AND phl.FertilizationNotes <> ''
      AND phl.FertilizationNotes NOT LIKE '%Irrigation%'
    ORDER BY phl.LoggedAt DESC
  `);
  
  // Parse notes to extract type and dosage
  const formatted = history.map(h => {
    const typeMatch = h.notes.match(/Type:\s*([^,]+)/i);
    const dosageMatch = h.notes.match(/Dosage:\s*([^\.]+)/i);
    const notesMatch = h.notes.match(/Notes:\s*(.+)$/i);
    
    return {
      id: h.id,
      date: h.date,
      fertilizer_type: typeMatch ? typeMatch[1].trim() : null,
      dosage: dosageMatch ? dosageMatch[1].trim() : null,
      notes: notesMatch ? notesMatch[1].trim() : null,
      logged_by: h.logged_by_name || 'Unknown'
    };
  });
  
  ok(res, {
    plant_id: plant_id,
    plant_name: plant[0].Name,
    history: formatted,
    count: formatted.length
  });
}));

// ============================================
// TECHNICAL NOTES ROUTES
// ============================================

// GET /api/agricultural/plants/:plant_id/notes - Get technical notes
router.get('/plants/:plant_id/notes', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Get technical notes from health logs (Recommendation field)
  const notes = await db.query(`
    SELECT phl.ID as id, phl.Recommendation as note, phl.LoggedAt as date,
           u.FullName as logged_by_name
    FROM PlantHealthLogs phl
    LEFT JOIN Users u ON phl.LoggedBy = u.ID
    WHERE phl.PlantID = ${db.escapeSQL(plant_id)}
      AND phl.Recommendation IS NOT NULL
      AND phl.Recommendation <> ''
    ORDER BY phl.LoggedAt DESC
  `);
  
  ok(res, {
    plant_id: plant_id,
    plant_name: plant[0].Name,
    notes: notes.map(n => ({
      id: n.id,
      note: n.note,
      date: n.date,
      logged_by: n.logged_by_name || 'Unknown'
    })),
    count: notes.length
  });
}));

// POST /api/agricultural/plants/:plant_id/notes - Add technical note
router.post('/plants/:plant_id/notes', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { plant_id } = req.params;
  
  const { error, value } = technicalNoteSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Verify plant exists
  const plant = await db.query(`SELECT ID, Name FROM Plants WHERE ID = ${db.escapeSQL(plant_id)}`);
  if (!plant || plant.length === 0) {
    return notFound(res, 'Plant not found');
  }
  
  // Create health log with note/recommendation
  const noteType = value.type || 'note';
  const notePrefix = noteType === 'recommendation' ? '[RECOMMENDATION] ' : noteType === 'observation' ? '[OBSERVATION] ' : '[NOTE] ';
  
  await db.execute(db.buildInsert('PlantHealthLogs', {
    PlantID: plant_id,
    LoggedBy: req.user.id,
    Recommendation: notePrefix + value.note,
    LoggedAt: new Date()
  }));
  
  created(res, {
    message: 'Technical note added successfully',
    plant_id: plant_id,
    plant_name: plant[0].Name,
    note: value.note,
    type: noteType
  });
}));

// ============================================
// SUPPLY REQUEST ROUTES
// ============================================

// GET /api/agricultural/supply-requests - Get all supply requests
router.get('/supply-requests', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  // Use Notifications table or create a simple structure
  // For now, we'll use PlantHealthLogs with a special format, or create in a simple way
  // Since we don't have a SupplyRequests table, we'll use a workaround with CareInstructions
  // or create a notification-like structure
  
  // Note: In production, create a SupplyRequests table with columns:
  // ID, RequestedBy, ItemType, ItemName, Quantity, Priority, Reason, Status, RequestedDate, FulfilledDate, Notes
  
  // For now, return empty array with message about table structure needed
  // Or use a notification-based approach
  
  // Check if SupplyRequests table exists
  let requests = [];
  try {
    requests = await db.query(`
      SELECT ID as id, RequestedBy as requested_by, ItemType as item_type,
             ItemName as item_name, Quantity as quantity, Priority as priority,
             Reason as reason, Status as status, RequestedDate as requested_date,
             FulfilledDate as fulfilled_date, Notes as notes
      FROM SupplyRequests
      ${status ? `WHERE Status = ${db.escapeSQL(status)}` : ''}
      ORDER BY RequestedDate DESC
    `);
  } catch (e) {
    // Table doesn't exist - return structure info
    return ok(res, {
      requests: [],
      count: 0,
      message: 'SupplyRequests table not found. Please create table with columns: ID, RequestedBy, ItemType, ItemName, Quantity, Priority, Reason, Status, RequestedDate, FulfilledDate, Notes'
    });
  }
  
  // Get requester names
  const formatted = await Promise.all(requests.map(async (req) => {
    const user = await db.query(`
      SELECT FullName FROM Users WHERE ID = ${db.escapeSQL(req.requested_by)}
    `);
    return {
      id: req.id,
      requested_by: req.requested_by,
      requested_by_name: user[0]?.FullName || 'Unknown',
      item_type: req.item_type,
      item_name: req.item_name,
      quantity: req.quantity,
      priority: req.priority || 'medium',
      reason: req.reason,
      status: req.status || 'pending',
      requested_date: req.requested_date,
      fulfilled_date: req.fulfilled_date || null,
      notes: req.notes || null
    };
  }));
  
  ok(res, {
    requests: formatted,
    count: formatted.length
  });
}));

// POST /api/agricultural/supply-requests - Create supply request
router.post('/supply-requests', authenticate, engineerOnly, asyncHandler(async (req, res) => {
  const { error, value } = createSupplyRequestSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const requestedDate = value.requested_date || new Date();
  
  try {
    await db.execute(db.buildInsert('SupplyRequests', {
      RequestedBy: req.user.id,
      ItemType: value.item_type,
      ItemName: value.item_name,
      Quantity: value.quantity,
      Priority: value.priority || 'medium',
      Reason: value.reason,
      Status: 'pending',
      RequestedDate: requestedDate
    }));
    
    // Get created request
    const requests = await db.query(`
      SELECT TOP 1 * FROM SupplyRequests 
      WHERE RequestedBy = ${db.escapeSQL(req.user.id)}
      ORDER BY ID DESC
    `);
    
    created(res, {
      message: 'Supply request created successfully',
      request: {
        id: requests[0].ID,
        item_type: requests[0].ItemType,
        item_name: requests[0].ItemName,
        quantity: requests[0].Quantity,
        priority: requests[0].Priority,
        status: requests[0].Status,
        requested_date: requests[0].RequestedDate
      }
    });
  } catch (e) {
    // Table doesn't exist
    return badRequest(res, 'SupplyRequests table not found. Please create the table first with required columns.');
  }
}));

// GET /api/agricultural/supply-requests/:id - Get single request
router.get('/supply-requests/:id', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const requests = await db.query(`
      SELECT ID as id, RequestedBy as requested_by, ItemType as item_type,
             ItemName as item_name, Quantity as quantity, Priority as priority,
             Reason as reason, Status as status, RequestedDate as requested_date,
             FulfilledDate as fulfilled_date, Notes as notes
      FROM SupplyRequests
      WHERE ID = ${db.escapeSQL(id)}
    `);
    
    if (!requests || requests.length === 0) {
      return notFound(res, 'Supply request not found');
    }
    
    const reqData = requests[0];
    const user = await db.query(`
      SELECT FullName FROM Users WHERE ID = ${db.escapeSQL(reqData.requested_by)}
    `);
    
    ok(res, {
      id: reqData.id,
      requested_by: reqData.requested_by,
      requested_by_name: user[0]?.FullName || 'Unknown',
      item_type: reqData.item_type,
      item_name: reqData.item_name,
      quantity: reqData.quantity,
      priority: reqData.priority,
      reason: reqData.reason,
      status: reqData.status,
      requested_date: reqData.requested_date,
      fulfilled_date: reqData.fulfilled_date,
      notes: reqData.notes
    });
  } catch (e) {
    return notFound(res, 'Supply request not found or table does not exist');
  }
}));

// PUT /api/agricultural/supply-requests/:id/status - Update request status (manager only)
router.put('/supply-requests/:id/status', authenticate, managerOrEngineer, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { error, value } = updateRequestStatusSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  // Check if user is manager (only managers can update status)
  if (req.user.roles && !req.user.roles.includes('manager')) {
    return badRequest(res, 'Only managers can update supply request status');
  }
  
  try {
    // Check if request exists
    const existing = await db.query(`SELECT ID FROM SupplyRequests WHERE ID = ${db.escapeSQL(id)}`);
    if (!existing || existing.length === 0) {
      return notFound(res, 'Supply request not found');
    }
    
    const updateData = {
      Status: value.status,
      UpdatedAt: new Date()
    };
    
    if (value.status === 'fulfilled') {
      updateData.FulfilledDate = new Date();
    }
    
    if (value.notes) {
      updateData.Notes = value.notes;
    }
    
    await db.execute(db.buildUpdate('SupplyRequests', updateData, { ID: id }));
    
    // Get updated request
    const updated = await db.query(`
      SELECT ID as id, Status as status, FulfilledDate as fulfilled_date, Notes as notes
      FROM SupplyRequests WHERE ID = ${db.escapeSQL(id)}
    `);
    
    ok(res, {
      message: 'Supply request status updated successfully',
      request: updated[0]
    });
  } catch (e) {
    return badRequest(res, 'Failed to update supply request. Table may not exist.');
  }
}));

module.exports = router;

