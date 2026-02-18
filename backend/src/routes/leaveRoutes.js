const express = require('express');
const router = express.Router();
const { applyLeave, myLeaves, pending, approve, reject, getBalance, getAllLeaves } = require('../controllers/leaveController');
const { authenticate } = require('../middleware/auth');

// Apply for leave
router.post('/apply', authenticate, applyLeave);

// Get my leaves
router.get('/my', authenticate, myLeaves);

// Get leave balance
router.get('/balance', authenticate, getBalance);

// Get all leaves with filtering (supports ?status=pending)
router.get('/', authenticate, getAllLeaves);

// Get pending leaves
router.get('/pending', authenticate, pending);

// Approve leave with PATCH
router.patch('/approve/:id', authenticate, approve);

// Reject leave with PATCH
router.patch('/reject/:id', authenticate, reject);

// POST aliases for backwards compatibility
router.post('/approve/:id', authenticate, approve);
router.post('/reject/:id', authenticate, reject);

module.exports = router;
