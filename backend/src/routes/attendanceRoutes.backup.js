const express = require('express');
const router = express.Router();
const { 
  checkIn, 
  checkOut, 
  getMyAttendance, 
  getMonthlyAttendance, 
  getTodayAttendance, 
  getAttendanceSummary,
  getAttendanceTimeline,
  markAbsentEmployees
} = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Check-in
router.post('/checkin', checkIn);

// Check-out
router.post('/checkout', checkOut);

// Get today's attendance
router.get('/today', getTodayAttendance);

// Get my attendance records
router.get('/my', getMyAttendance);

// Get monthly attendance
router.get('/monthly', getMonthlyAttendance);

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
