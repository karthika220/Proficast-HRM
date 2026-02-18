const express = require('express');
const router = express.Router();
const { authenticate, roleGuard } = require('../middleware/auth');
const {
  getGroupedEscalations,
  createEscalation,
  getEmployeeEscalationHistory,
  getEscalationSummary,
} = require('../controllers/escalationController');

// All routes require authentication
router.use(authenticate);

// Create escalation
router.post('/', createEscalation);

// Get escalation summary statistics
router.get('/summary', getEscalationSummary);

// Get grouped escalations (for TL/HR/MD view)
router.get('/grouped', roleGuard('TL', 'HR', 'MD', 'MANAGER'), getGroupedEscalations);

// Get employee escalation history
router.get('/history/:employeeId', getEmployeeEscalationHistory);

module.exports = router;
