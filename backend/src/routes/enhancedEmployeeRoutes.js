const express = require('express');
const router = express.Router();
const { authenticate, roleGuard } = require('../middleware/auth');
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  archiveEmployee,
  getReportingHierarchy,
  getAvailableManagers,
} = require('../controllers/enhancedEmployeeController');

// All routes require authentication
router.use(authenticate);

// Get employees with role-based filtering
router.get('/', getEmployees);

// Get employee by ID with permissions check
router.get('/:id', getEmployeeById);

// Update employee with permissions check
router.put('/:id', updateEmployee);
router.patch('/:id', updateEmployee);

// Create employee (HR only)
router.post('/', roleGuard('HR', 'MD'), createEmployee);

// Archive employee (HR and MD only)
router.delete('/:id', roleGuard('HR', 'MD'), archiveEmployee);

// Reporting hierarchy (managers and above only)
router.get('/hierarchy/reporting', roleGuard('MANAGER', 'HR', 'MD'), getReportingHierarchy);

// Available managers for assignment (HR and MD only)
router.get('/hierarchy/managers', roleGuard('HR', 'MD'), getAvailableManagers);

module.exports = router;
