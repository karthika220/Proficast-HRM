const express = require('express');
const router = express.Router();
const { authenticate, roleGuard } = require('../middleware/auth');
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getMonthlyAttendance,
  getTodayAttendance,
  getAttendanceSummary,
  getRecentAttendance,
  checkMissingCheckIns,
} = require('../controllers/enhancedAttendanceController');

// All routes require authentication
router.use(authenticate);

// Check-in/Check-out (all authenticated users)
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);

// Personal attendance (all authenticated users)
router.get('/today', getTodayAttendance);
router.get('/my', getMyAttendance);
router.get('/monthly', getMonthlyAttendance);

// Recent attendance with role-based filtering
router.get('/recent', getRecentAttendance);

// Attendance summary (role-based access)
router.get('/summary', getAttendanceSummary);

// Check missing check-ins (managers and above only)
router.get('/missing-checkins', roleGuard('MANAGER', 'HR', 'MD'), checkMissingCheckIns);

module.exports = router;
