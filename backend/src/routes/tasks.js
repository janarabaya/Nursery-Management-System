/**
 * Tasks Routes
 * 
 * POST /api/tasks - Create task (manager)
 * GET /api/tasks - Get all tasks (manager)
 * PATCH /api/tasks/:id - Update task status (manager)
 */

const express = require('express');
const Joi = require('joi');
const db = require('../config/accessDb');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');
const { ok, created, badRequest, notFound, serverError } = require('../utils/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createTaskSchema = Joi.object({
  employee_id: Joi.string().required(),
  title: Joi.string().required(),
  description: Joi.string().allow('', null).optional(),
  deadline: Joi.string().isoDate().required()
});

const updateTaskSchema = Joi.object({
  status: Joi.string().valid('pending', 'completed', 'in_progress', 'cancelled').required()
});

// ============================================
// POST /api/tasks - Create task
// ============================================

router.post('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { error, value } = createTaskSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { employee_id, title, description, deadline } = value;
  const taskId = require('uuid').v4();
  const createdBy = req.user.id;
  
  // Check if employee exists
  const employee = await db.query(`SELECT UserID FROM Employees WHERE UserID = ${db.escapeSQL(employee_id)}`);
  if (!employee || employee.length === 0) {
    return notFound(res, 'Employee not found');
  }
  
  // Insert task into database
  // Assuming we have a Tasks table with: TaskID, EmployeeID, Title, Description, Deadline, Status, CreatedBy, CreatedAt
  await db.execute(db.buildInsert('Tasks', {
    TaskID: taskId,
    EmployeeID: employee_id,
    Title: title,
    Description: description || '',
    Deadline: new Date(deadline),
    Status: 'pending',
    CreatedBy: createdBy,
    CreatedAt: new Date()
  }));
  
  // Fetch the created task
  const tasks = await db.query(`
    SELECT t.TaskID as id, t.EmployeeID as employee_id, t.Title as title, 
           t.Description as description, t.Deadline as deadline, t.Status as status,
           t.CreatedAt as created_at, e.[Full Name] as employee_name, e.Email as employee_email
    FROM Tasks t
    LEFT JOIN Employees e ON t.EmployeeID = e.UserID
    WHERE t.TaskID = ${db.escapeSQL(taskId)}
  `);
  
  if (!tasks || tasks.length === 0) {
    return serverError(res, 'Failed to retrieve created task');
  }
  
  created(res, {
    id: tasks[0].id,
    employee_id: tasks[0].employee_id,
    employee_name: tasks[0].employee_name,
    employee_email: tasks[0].employee_email,
    title: tasks[0].title,
    description: tasks[0].description,
    deadline: tasks[0].deadline,
    status: tasks[0].status,
    created_at: tasks[0].created_at
  });
}));

// ============================================
// GET /api/tasks - Get all tasks
// ============================================

router.get('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { employee_id, status } = req.query;
  
  let whereClause = '1=1';
  if (employee_id) {
    whereClause += ` AND t.EmployeeID = ${db.escapeSQL(employee_id)}`;
  }
  if (status) {
    whereClause += ` AND t.Status = ${db.escapeSQL(status)}`;
  }
  
  const tasks = await db.query(`
    SELECT t.TaskID as id, t.EmployeeID as employee_id, t.Title as title,
           t.Description as description, t.Deadline as deadline, t.Status as status,
           t.CreatedAt as created_at, t.CreatedBy as created_by,
           e.[Full Name] as employee_name, e.Email as employee_email
    FROM Tasks t
    LEFT JOIN Employees e ON t.EmployeeID = e.UserID
    WHERE ${whereClause}
    ORDER BY t.CreatedAt DESC
  `);
  
  const formattedTasks = tasks.map(t => ({
    id: t.id,
    employee_id: t.employee_id,
    employee_name: t.employee_name || 'Unknown',
    employee_email: t.employee_email || '',
    title: t.title,
    description: t.description || '',
    deadline: t.deadline,
    status: t.status || 'pending',
    created_at: t.created_at,
    created_by: t.created_by
  }));
  
  ok(res, formattedTasks);
}));

// ============================================
// PATCH /api/tasks/:id - Update task status
// ============================================

router.patch('/:id', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { error, value } = updateTaskSchema.validate(req.body);
  if (error) {
    return badRequest(res, error.details[0].message);
  }
  
  const { status } = value;
  
  // Check if task exists
  const existing = await db.query(`SELECT TaskID FROM Tasks WHERE TaskID = ${db.escapeSQL(id)}`);
  if (!existing || existing.length === 0) {
    return notFound(res, 'Task not found');
  }
  
  // Update task status
  await db.execute(db.buildUpdate('Tasks', { 
    Status: status,
    UpdatedAt: new Date()
  }, { TaskID: id }));
  
  // Fetch updated task
  const tasks = await db.query(`
    SELECT t.TaskID as id, t.EmployeeID as employee_id, t.Title as title,
           t.Description as description, t.Deadline as deadline, t.Status as status,
           t.CreatedAt as created_at, e.[Full Name] as employee_name, e.Email as employee_email
    FROM Tasks t
    LEFT JOIN Employees e ON t.EmployeeID = e.UserID
    WHERE t.TaskID = ${db.escapeSQL(id)}
  `);
  
  if (!tasks || tasks.length === 0) {
    return serverError(res, 'Failed to retrieve updated task');
  }
  
  const task = tasks[0];
  ok(res, {
    id: task.id,
    employee_id: task.employee_id,
    employee_name: task.employee_name || 'Unknown',
    employee_email: task.employee_email || '',
    title: task.title,
    description: task.description || '',
    deadline: task.deadline,
    status: task.status,
    created_at: task.created_at
  });
}));

module.exports = router;

