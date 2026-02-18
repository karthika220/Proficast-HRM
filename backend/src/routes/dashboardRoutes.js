const express = require('express');
const router = express.Router();
const { stats, todayAttendance, getTodayAttendanceLive } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, stats);
router.get('/today-attendance', authenticate, todayAttendance);
router.get('/attendance-live', authenticate, getTodayAttendanceLive);

module.exports = router;
