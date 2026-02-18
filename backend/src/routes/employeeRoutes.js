const express = require('express');
const router = express.Router();
const { createEmployee, getEmployees, getEmployeeById, updateEmployee, archiveEmployee, getReportingTree, getEmployeeActivity } = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getEmployees);
router.post('/', authenticate, createEmployee);
router.get('/:id', authenticate, getEmployeeById);
router.put('/:id', authenticate, updateEmployee);
router.patch('/:id', authenticate, updateEmployee);
router.delete('/:id', authenticate, archiveEmployee);
router.get('/reporting-tree/:userId', authenticate, getReportingTree);
router.get('/:employeeId/activity', authenticate, getEmployeeActivity);

module.exports = router;
