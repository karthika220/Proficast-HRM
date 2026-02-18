const express = require('express');
const router = express.Router();
const { authenticate, roleGuard } = require('../middleware/auth');
const {
  getLeaveBalance,
  submitLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  cancelLeaveRequest,
  getLeaveStatistics,
} = require('../controllers/enhancedLeaveController');

// All routes require authentication
router.use(authenticate);

// Leave balance (all authenticated users)
router.get('/balance', getLeaveBalance);

// Leave requests (all authenticated users)
router.post('/request', submitLeaveRequest);
router.get('/my', getMyLeaveRequests);
router.delete('/:requestId', cancelLeaveRequest);

// All leave requests with role-based filtering
router.get('/all', getAllLeaveRequests);

// Approve/reject leave requests (managers and above only)
router.put('/:requestId/approve', roleGuard('MANAGER', 'HR', 'MD'), approveLeaveRequest);

// Leave statistics (role-based access)
router.get('/statistics', getLeaveStatistics);

module.exports = router;
