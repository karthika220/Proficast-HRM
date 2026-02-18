const express = require('express');
const router = express.Router();
const { 
  checkIn, 
  checkOut, 
  resumeFromBreak,
  getMyAttendance, 
  getMonthlyAttendance, 
  getTodayAttendance, 
  getAttendanceSummary,
  getAttendanceTimeline,
  getRecentAttendance,
  checkMissingCheckIns
} = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Check-in
router.post('/checkin', checkIn);

// Check-out
router.post('/checkout', checkOut);

// Resume from break
router.post('/resume', resumeFromBreak);

// Break management routes
router.post('/break/start', async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { breakType = 'LUNCH' } = req.body;
    
    const attendance = await AttendanceService.startBreak(userId, new Date(), breakType);
    
    res.json({
      success: true,
      message: 'Break started successfully',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/break/end', async (req, res) => {
  try {
    const { id: userId } = req.user;
    
    const attendance = await AttendanceService.endBreak(userId, new Date());
    
    res.json({
      success: true,
      message: 'Break ended successfully',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get today's attendance
router.get('/today', getTodayAttendance);

// Get current user's attendance
router.get('/my', getMyAttendance);

// Get monthly attendance
router.get('/monthly', getMonthlyAttendance);

// Enhanced attendance statistics
router.get('/stats', async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { startDate, endDate } = req.query;
    
    const stats = await AttendanceService.getAttendanceStats(
      userId, 
      new Date(startDate), 
      new Date(endDate)
    );
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get attendance summary
router.get('/summary', getAttendanceSummary);

// Get recent attendance (for dashboard timeline)
router.get('/recent', getRecentAttendance);

// Get attendance timeline
router.get('/timeline', getAttendanceTimeline);

// Check for missing check-ins (managers only)
router.get('/missing-checkins', checkMissingCheckIns);

// Escalation check route
router.post('/check-escalations', async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { timePeriod = 30 } = req.body;
    
    const escalationCheck = await EscalationService.checkAndCreateEscalations(userId, timePeriod);
    
    res.json({
      success: true,
      data: escalationCheck
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
