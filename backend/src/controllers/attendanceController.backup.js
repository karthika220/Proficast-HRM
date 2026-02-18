const { PrismaClient } = require('@prisma/client');
const EscalationService = require('../services/escalationService');
const EmployeeActivityService = require('../services/employeeActivityService');

const prisma = new PrismaClient();

// PRD Office timing constants
const OFFICE_START_HOUR = 9;
const OFFICE_START_MINUTE = 0;
const OFFICE_END_HOUR = 18;
const OFFICE_END_MINUTE = 45;
const GRACE_PERIOD_MINUTES = 10; // Grace period until 9:10 AM
const LATE_THRESHOLD_MINUTES = 10; // After 9:10 AM is late
const ABSENT_THRESHOLD_HOUR = 10; // Mark absent if no check-in by 10:00 AM
const REMINDER_TIME_HOUR = 9;
const REMINDER_TIME_MINUTE = 30;
const WORKING_DAYS = [1, 2, 3, 4, 5, 6]; // Monday-Saturday (1-6)
const WEEKEND_DAY = 0; // Sunday (0)
const NET_WORKING_HOURS = 8.75; // 8h 45m in decimal hours
const LUNCH_BREAK_DURATION = 60; // 1 hour lunch break in minutes
const LUNCH_BREAK_START_HOUR = 13; // 1:30 PM reference
const LUNCH_BREAK_START_MINUTE = 30;
const OVERTIME_START_HOUR = 18;
const OVERTIME_START_MINUTE = 45;
const OVERTIME_THRESHOLD_HOUR = 19; // Overtime after 7:15 PM
const OVERTIME_THRESHOLD_MINUTE = 15;
const EARLY_EXIT_THRESHOLD_HOUR = 18; // Early exit before 6:45 PM
const EARLY_EXIT_THRESHOLD_MINUTE = 45;
const HALF_DAY_THRESHOLD_HOUR = 13; // Half day if checkout before 1:00 PM
const HALF_DAY_THRESHOLD_MINUTE = 0;

// PRD Helper functions

// Check if today is a working day
const isWorkingDay = (date) => {
  const dayOfWeek = date.getDay();
  return WORKING_DAYS.includes(dayOfWeek);
};

// Check if current time is within grace period
const isWithinGracePeriod = (currentTime) => {
  const graceEndTime = new Date(currentTime);
  graceEndTime.setHours(OFFICE_START_HOUR, OFFICE_START_MINUTE + GRACE_PERIOD_MINUTES, 0, 0);
  return currentTime <= graceEndTime;
};

// Check if check-in is late
const isLateCheckIn = (checkInTime) => {
  const lateStartTime = new Date(checkInTime);
  lateStartTime.setHours(OFFICE_START_HOUR, OFFICE_START_MINUTE + LATE_THRESHOLD_MINUTES, 0, 0);
  return checkInTime > lateStartTime;
};

// Calculate late minutes
const calculateLateMinutes = (checkInTime) => {
  const officeStart = new Date(checkInTime);
  officeStart.setHours(OFFICE_START_HOUR, OFFICE_START_MINUTE, 0, 0);
  
  if (checkInTime > officeStart) {
    return Math.round((checkInTime - officeStart) / (1000 * 60));
  }
  return 0;
};

// Check if checkout is early exit
const isEarlyExit = (checkOutTime) => {
  const earlyExitTime = new Date(checkOutTime);
  earlyExitTime.setHours(EARLY_EXIT_THRESHOLD_HOUR, EARLY_EXIT_THRESHOLD_MINUTE, 0, 0);
  return checkOutTime < earlyExitTime;
};

// Check if checkout qualifies for half day
const isHalfDay = (checkOutTime) => {
  const halfDayTime = new Date(checkOutTime);
  halfDayTime.setHours(HALF_DAY_THRESHOLD_HOUR, HALF_DAY_THRESHOLD_MINUTE, 0, 0);
  return checkOutTime < halfDayTime;
};

// Check if checkout qualifies for overtime
const isOvertime = (checkOutTime) => {
  const overtimeTime = new Date(checkOutTime);
  overtimeTime.setHours(OVERTIME_THRESHOLD_HOUR, OVERTIME_THRESHOLD_MINUTE, 0, 0);
  return checkOutTime > overtimeTime;
};

// Calculate total work minutes according to PRD rules
const calculateTotalWorkMinutes = (checkInTime, checkOutTime, totalBreakMinutes) => {
  if (!checkInTime || !checkOutTime) return 0;
  
  const totalMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));
  const workMinutes = totalMinutes - (totalBreakMinutes || 0);
  
  return Math.max(0, workMinutes);
};

// Send notifications to HR and Manager
const sendAbsentNotification = async (userId, employeeName) => {
  try {
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      include: { reportingManager: true }
    });
    
    if (employee) {
      // Notify HR users
      const hrUsers = await prisma.user.findMany({
        where: { role: 'HR' }
      });
      
      // Notify manager if exists
      const notifications = [];
      
      hrUsers.forEach(hr => {
        notifications.push({
          userId: hr.id,
          title: 'Employee Absent Alert',
          message: `${employeeName} has not checked in today (past ${ABSENT_THRESHOLD_HOUR}:00 AM)`,
          type: 'ABSENT'
        });
      });
      
      if (employee.reportingManager) {
        notifications.push({
          userId: employee.reportingManager.id,
          title: 'Team Member Absent',
          message: `${employeeName} has not checked in today`,
          type: 'ABSENT'
        });
      }
      
      // Create notifications (would implement notification service)
      console.log('Absent notifications sent:', notifications);
    }
  } catch (error) {
    console.error('Error sending absent notification:', error);
  }
};

// Helper function to calculate overtime
const calculateOvertime = (checkOutTime) => {
  if (!checkOutTime) return 0;
  
  const checkout = new Date(checkOutTime);
  const overtimeStart = new Date(checkout);
  overtimeStart.setHours(OVERTIME_START_HOUR, OVERTIME_START_MINUTE, 0, 0);
  
  if (checkout > overtimeStart) {
    const overtimeMs = checkout - overtimeStart;
    return Math.round(overtimeMs / (1000 * 60)); // Return overtime in minutes
  }
  return 0;
};

// Helper function to check lunch break reminder
const checkLunchBreakReminder = async (userId, checkOutTime) => {
  if (!checkOutTime) return;
  
  const checkout = new Date(checkOutTime);
  const checkoutHour = checkout.getHours();
  
  // Check if checkout is in the afternoon (12:00 PM - 2:00 PM)
  if (checkoutHour >= 12 && checkoutHour <= 14) {
    // Schedule a reminder after 1 hour
    const reminderTime = new Date(checkout.getTime() + LUNCH_BREAK_REMINDER_MINUTES * 60 * 1000);
    
    // Create a reminder notification
    setTimeout(async () => {
      try {
        // Check if user has checked in again
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        const latestAttendance = await prisma.attendance.findFirst({
          where: {
            userId: userId,
            date: {
              gte: startOfDay,
              lt: endOfDay
            }
          },
          orderBy: {
            checkIn: 'desc'
          }
        });
        
        // If no new check-in after lunch break, send reminder
        if (latestAttendance && new Date(latestAttendance.checkIn) <= checkout) {
          await createNotification(
            userId,
            'Lunch Break Reminder',
            'Please check in after your lunch break to continue tracking your attendance.',
            'ATTENDANCE'
          );
        }
      } catch (error) {
        console.error('Error sending lunch break reminder:', error);
      }
    }, LUNCH_BREAK_REMINDER_MINUTES * 60 * 1000);
  }
};

// Helper function to create notifications
const createNotification = async (userId, title, message, type) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        read: false
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Helper function to calculate attendance status
const calculateStatus = (checkIn, checkOut, date) => {
  if (!checkIn) {
    // No check-in yet - check if it's past 10 AM
    const tenAM = new Date(date);
    tenAM.setHours(10, 0, 0, 0);
    const now = new Date();
    if (now > tenAM) {
      return "Absent";
    }
    return "Pending";
  }

  const checkInTime = new Date(checkIn);
  
  // Set time thresholds based on the date
  const nineTen = new Date(date);
  nineTen.setHours(9, 10, 0, 0);

  const onePM = new Date(date);
  onePM.setHours(13, 0, 0, 0);

  const sixFortyFive = new Date(date);
  sixFortyFive.setHours(18, 45, 0, 0);

  // If check-out exists, check for early checkout first
  if (checkOut) {
    const checkOutTime = new Date(checkOut);
    // Checkout before 6:45 PM = Early (overrides other statuses)
    if (checkOutTime < sixFortyFive) {
      return "Early";
    }
  }

  // After 1 PM check-in = HalfDay
  if (checkInTime >= onePM) {
    return "HalfDay";
  }

  // After 9:10 AM check-in = Late
  if (checkInTime > nineTen) {
    return "Late";
  }

  // Before 9:10 AM = Present
  return "Present";
};

// Helper function to check if it's before office end time
const isBeforeOfficeEnd = (time) => {
  const checkTime = new Date(time);
  const officeEnd = new Date(checkTime);
  officeEnd.setHours(OFFICE_END_HOUR, OFFICE_END_MINUTE, 0, 0);
  
  return checkTime < officeEnd;
};

// Helper function to calculate break duration in minutes
const calculateBreakMinutes = (breakStart, breakEnd) => {
  if (!breakStart || !breakEnd) return 0;
  
  const start = new Date(breakStart);
  const end = new Date(breakEnd);
  
  return Math.round((end - start) / (1000 * 60));
};

// Helper function to get user's employee ID
const getUserEmployeeId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { employeeId: true }
  });
  return user?.employeeId;
};

// PRD Check-in for the day
const checkIn = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { checkInTime } = req.body; // Optional custom check-in time
    
    const now = new Date();
    const checkInDateTime = checkInTime ? new Date(checkInTime) : now;
    
    // Check if today is a working day
    if (!isWorkingDay(checkInDateTime)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check-in on non-working days (Sunday is auto week-off).'
      });
    }
    
    const startOfDay = new Date(checkInDateTime.getFullYear(), checkInDateTime.getMonth(), checkInDateTime.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    // Check for existing attendance records today
    const existingAttendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      orderBy: {
        checkIn: 'desc'
      }
    });

    // PRD Rule: Cannot check-in twice without checkout
    const activeSession = existingAttendanceRecords.find(record => 
      record.checkIn && !record.checkOut
    );

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in. Please check out first.'
      });
    }

    // PRD Rule: Determine if this is morning check-in or post-lunch check-in
    const hasLunchCheckout = existingAttendanceRecords.some(record => 
      record.breakType === 'LUNCH' && record.breakStart && !record.breakEnd
    );
    
    if (hasLunchCheckout) {
      // This is post-lunch check-in
      const lunchSession = existingAttendanceRecords.find(record => 
        record.breakType === 'LUNCH' && record.breakStart && !record.breakEnd
      );
      
      // Update lunch break end and create new session
      const breakEndTime = checkInDateTime;
      const breakDuration = Math.round((breakEndTime - new Date(lunchSession.breakStart)) / (1000 * 60));
      
      // Update lunch session
      await prisma.attendance.update({
        where: { id: lunchSession.id },
        data: {
          breakEnd: breakEndTime,
          breakMinutes: breakDuration,
          status: 'WORKING'
        }
      });
      
      // Create post-lunch session
      const attendance = await prisma.attendance.create({
        data: {
          userId: userId,
          date: startOfDay,
          checkIn: checkInDateTime,
          status: 'PRESENT',
          checkInCount: existingAttendanceRecords.length + 1,
          attendanceState: 'POST_LUNCH_CHECKIN'
        }
      });
      
      return res.json({
        success: true,
        message: 'Post-lunch check-in successful',
        attendance
      });
    }
    
    // This is morning check-in
    let status = 'PRESENT';
    let isLate = false;
    let lateMinutes = 0;
    let gracePeriodUsed = false;
    
    // PRD Rule: Check if within grace period (9:00-9:10 AM)
    if (isWithinGracePeriod(checkInDateTime)) {
      gracePeriodUsed = true;
    }
    
    // PRD Rule: Check if late (after 9:10 AM)
    if (isLateCheckIn(checkInDateTime)) {
      status = 'LATE';
      isLate = true;
      lateMinutes = calculateLateMinutes(checkInDateTime);
    }
    
    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId: userId,
        date: startOfDay,
        checkIn: checkInDateTime,
        status: status,
        isLate: isLate,
        lateMinutes: lateMinutes,
        gracePeriodUsed: gracePeriodUsed,
        checkInCount: existingAttendanceRecords.length + 1,
        attendanceState: 'MORNING_CHECKIN'
      }
    });

    return res.json({
      success: true,
      message: gracePeriodUsed ? 'Check-in successful (grace period used)' : 
                isLate ? `Check-in successful (late by ${lateMinutes} minutes)` : 
                'Check-in successful',
      attendance
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check in',
      details: error.message
    });
  }
};

// PRD Check-out with lunch break model
const checkOut = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { checkoutType, breakType } = req.body; // LUNCH or FINAL
    
    const checkoutTime = new Date();
    const startOfDay = new Date(checkoutTime.getFullYear(), checkoutTime.getMonth(), checkoutTime.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    // Get today's attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      orderBy: {
        checkIn: 'desc'
      }
    });

    if (attendanceRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No check-in record found for today. Please check in first.'
      });
    }

    // Find active session
    const activeSession = attendanceRecords.find(record => 
      record.checkIn && !record.checkOut
    );

    if (!activeSession) {
      return res.status(400).json({
        success: false,
        message: 'No active check-in session found. Please check in first.'
      });
    }

    // PRD Rule: Handle different checkout types
    if (checkoutType === 'LUNCH') {
      // Mandatory lunch checkout
      const attendance = await prisma.attendance.update({
        where: { id: activeSession.id },
        data: {
          breakStart: checkoutTime,
          breakType: 'LUNCH',
          status: 'ON_LUNCH'
        }
      });

      return res.json({
        success: true,
        message: 'Lunch break started successfully',
        data: attendance
      });
    }
    
    // Final checkout logic
    let finalStatus = 'PRESENT';
    let overtimeHours = 0;
    let totalWorkHours = 0;
    let totalBreakMinutes = 0;
    
    // Calculate total break minutes from all sessions
    attendanceRecords.forEach(record => {
      if (record.breakMinutes) {
        totalBreakMinutes += record.breakMinutes;
      }
    });
    
    // PRD Rule: Check for half day
    if (isHalfDay(checkoutTime)) {
      finalStatus = 'HALF_DAY';
    }
    
    // PRD Rule: Check for early exit
    if (isEarlyExit(checkoutTime) && !isHalfDay(checkoutTime)) {
      finalStatus = 'EARLY_EXIT';
    }
    
    // PRD Rule: Calculate overtime
    if (isOvertime(checkoutTime)) {
      const overtimeStart = new Date(checkoutTime);
      overtimeStart.setHours(OVERTIME_START_HOUR, OVERTIME_START_MINUTE, 0, 0);
      const overtimeMinutes = Math.round((checkoutTime - overtimeStart) / (1000 * 60));
      overtimeHours = overtimeMinutes / 60;
    }
    
    // Calculate total work hours according to PRD rules
    const firstCheckIn = attendanceRecords[0].checkIn;
    totalWorkHours = calculateTotalWorkMinutes(firstCheckIn, checkoutTime, totalBreakMinutes) / 60;
    
    // Update all sessions to completed
    await prisma.attendance.updateMany({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lt: endOfDay
        },
        checkOut: null
      },
      data: {
        checkOut: checkoutTime,
        status: finalStatus,
        totalWorkHours: totalWorkHours,
        totalBreakMinutes: totalBreakMinutes,
        overtimeHours: overtimeHours
      }
    });

    return res.json({
      success: true,
      message: 'Final checkout successful',
      data: {
        checkOut: checkoutTime,
        status: finalStatus,
        totalWorkHours,
        totalBreakMinutes,
        overtimeHours
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check out',
      details: error.message
    });
  }
};
// Auto mark absent for employees who haven't checked in by 10:00 AM
const markAbsentEmployees = async () => {
  try {
    const now = new Date();
    if (!isWorkingDay(now)) return; // Skip weekends
    
    const absentThreshold = new Date(now);
    absentThreshold.setHours(ABSENT_THRESHOLD_HOUR, 0, 0, 0);
    
    if (now < absentThreshold) return; // Not yet 10:00 AM
    
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    // Get all employees who haven't checked in today
    const employeesWithoutCheckIn = await prisma.user.findMany({
      where: {
        role: { in: ['EMPLOYEE', 'MANAGER'] },
        attendance: {
          none: {
            date: {
              gte: startOfDay,
              lt: endOfDay
            },
            checkIn: {
              not: null
            }
          }
        }
      },
      include: {
        reportingManager: true
      }
    });
    
    // Mark them as absent
    for (const employee of employeesWithoutCheckIn) {
      await prisma.attendance.create({
        data: {
          userId: employee.id,
          date: startOfDay,
          status: 'ABSENT',
          checkInCount: 0,
          attendanceState: 'ABSENT'
        }
      });
      
      // Send notifications to HR and Manager
      await sendAbsentNotification(employee.id, employee.fullName);
    }
    
    console.log(`Marked ${employeesWithoutCheckIn.length} employees as absent`);
  } catch (error) {
    console.error('Error marking absent employees:', error);
  }
};
// Schedule absent marking job to run every day at 10:05 AM
const scheduleAbsentMarking = () => {
  const schedule = require('node-schedule');
  
  // Schedule to run every day at 10:05 AM
  schedule.scheduleJob('5 10 * * *', async () => {
    console.log('Running absent marking job...');
    await markAbsentEmployees();
  });
  
  console.log('Absent marking job scheduled for 10:05 AM daily');
};

// Initialize scheduling when module loads
scheduleAbsentMarking();
// Get today's attendance record for logged-in user
const getTodayAttendance = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        checkIn: 'desc'
      }
    });

    if (!attendance || attendance.length === 0) {
      // Check if today is a weekend
      if (!isWorkingDay(today)) {
        return res.json({
          date: today,
          status: "Weekend",
          checkIn: null,
          checkOut: null,
          breakStart: null,
          breakEnd: null,
          breakMinutes: 0,
          isLate: false,
          lateMinutes: 0,
          checkInCount: 0,
          totalBreakMinutes: 0,
          overtimeHours: 0,
          totalWorkHours: 0
        });
      }
      
      // Return pending status if no record found and it's before 10 AM
      const tenAM = new Date();
      tenAM.setHours(10, 0, 0, 0);
      const isPending = new Date() < tenAM;

      return res.json({
        date: today,
        status: isPending ? "Pending" : "Absent",
        checkIn: null,
        checkOut: null,
        breakStart: null,
        breakEnd: null,
        breakMinutes: 0,
        isLate: false,
        lateMinutes: 0,
        checkInCount: 0,
        totalBreakMinutes: 0,
        overtimeHours: 0,
        totalWorkHours: 0
      });
    }

    // Return all sessions for today
    return res.json(attendance);
  } catch (error) {
    console.error("Get today's attendance error:", error);
    res.status(500).json({
      error: "Failed to fetch today's attendance",
      details: error.message,
    });
  }
// Get current user's attendance records
const getMyAttendance = async (req, res) => {
    }

    // FINAL CHECKOUT FLOW
    if (checkoutType === "FINAL") {
      // Calculate total break minutes from all sessions
      let totalBreakMinutes = 0;
      let totalWorkingMinutes = 0;
      
      // Calculate totals from all sessions today
      attendanceRecords.forEach(record => {
        if (record.checkIn && record.checkOut) {
          const sessionMinutes = Math.round((new Date(record.checkOut) - new Date(record.checkIn)) / (1000 * 60));
          const sessionBreakMinutes = record.breakMinutes || 0;
          totalWorkingMinutes += Math.max(0, sessionMinutes - sessionBreakMinutes);
          totalBreakMinutes += sessionBreakMinutes;
        }
      });
      
      // Add current session working time
      if (activeSession.checkIn) {
        const currentSessionMinutes = Math.round((checkoutTime - new Date(activeSession.checkIn)) / (1000 * 60));
        const currentBreakMinutes = activeSession.breakMinutes || 0;
        totalWorkingMinutes += Math.max(0, currentSessionMinutes - currentBreakMinutes);
        totalBreakMinutes += currentBreakMinutes;
      }
      
      // Calculate overtime using the enhanced function
      const overtimeMinutes = calculateOvertime(checkoutTime);
      const overtimeHours = overtimeMinutes / 60;
      
      // Check for lunch break reminder if checkout is in afternoon
      await checkLunchBreakReminder(userId, checkoutTime);

      // Update all sessions to mark as completed
      await prisma.attendance.updateMany({
        where: {
          userId: userId,
          date: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        data: {
          status: "COMPLETED"
        }
      });
      
      // Update the active session with final data
      attendance = await prisma.attendance.update({
        where: { id: activeSession.id },
        data: {
          checkOut: checkoutTime,
          totalWorkHours: totalWorkingMinutes / 60, // Convert minutes to hours
          breakMinutes: totalBreakMinutes,
          overtimeHours: overtimeHours,
          status: "COMPLETED"
        }
      });

      // Upsert employee activity record
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { employeeId: true }
        });
        
        if (user?.employeeId) {
          await EmployeeActivityService.upsertTodayActivity(user.employeeId, {
            checkIn: attendance.checkIn,
            checkOut: checkoutTime,
            breakMinutes: totalBreakMinutes,
            workingMinutes: workingMinutes,
            overtimeMinutes: overtimeMinutes, // Keep as minutes for activity
            status: 'Present'
          });
        }
      } catch (activityError) {
        console.warn('Failed to upsert employee activity:', activityError.message);
      } // Don't fail checkout if activity upsert fails

      return res.json({
        success: true,
        message: 'Checked out successfully',
        data: attendance
      });
    }

    // If no checkoutType specified, treat as FINAL checkout for backward compatibility
    const totalBreakMinutes = attendance.totalBreakMinutes || 0;
    const checkInTime = new Date(attendance.checkIn);
    const workingMinutes = Math.round((checkoutTime - checkInTime) / (1000 * 60)) - totalBreakMinutes;
    
    const officeEndTime = new Date(checkoutTime);
    officeEndTime.setHours(18, 45, 0, 0);
    
    let overtimeMinutes = 0;
    if (checkoutTime > officeEndTime) {
      overtimeMinutes = Math.round((checkoutTime - officeEndTime) / (1000 * 60));
    }
    
    const overtimeHours = overtimeMinutes / 60; // Convert to hours for database

    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: checkoutTime,
        totalWorkHours: workingMinutes / 60, // Convert minutes to hours
        breakMinutes: totalBreakMinutes,
        overtimeHours: overtimeHours,
        status: "COMPLETED"
      }
    });

    return res.json({
      success: true,
      message: 'Checked out successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process checkout'
    });
  }
};

// Resume from break endpoint
const resumeFromBreak = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const resumeTime = new Date();
    
    // Get today's attendance record
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    let attendance = await prisma.attendance.findFirst({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No attendance record found for today.'
      });
    }

    if (!attendance.breakStartTime || attendance.breakEndTime) {
      return res.status(400).json({
        success: false,
        message: 'Not currently on break.'
      });
    }

    // Calculate break duration
    const breakDuration = Math.round((resumeTime - new Date(attendance.breakStartTime)) / (1000 * 60));
    const totalBreakMinutes = (attendance.totalBreakMinutes || 0) + breakDuration;

    // Update attendance
    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        breakEndTime: resumeTime,
        breakStartTime: null,
        totalBreakMinutes: totalBreakMinutes,
        breakMinutes: totalBreakMinutes,
        status: "WORKING"
      }
    });

    return res.json({
      success: true,
      message: 'Resumed from break successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Resume from break error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to resume from break'
    });
  }
};

// Get recent attendance with break information
const getRecentAttendance = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { limit = 7 } = req.query;

    let whereClause = { userId };

    // Managers can see team attendance
    if (role === "MANAGER") {
      const teamMembers = await prisma.user.findMany({
        where: { reportingManagerId: userId },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map(member => member.id);
      whereClause = {
        userId: { in: [...teamMemberIds, userId] }
      };
    }

    // HR and MD can see all attendance
    if (role === "HR" || role === "MD") {
      whereClause = {};
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: {
        date: "desc",
      },
      take: parseInt(limit),
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    res.json({
      attendance: attendances,
    });
  } catch (error) {
    console.error("Get recent attendance error:", error);
    res.status(500).json({
      error: "Failed to fetch recent attendance",
      details: error.message,
    });
  }
};

// Trigger notifications for late arrivals
const triggerLateArrivalNotifications = async (userId, employeeId, lateMinutes) => {
  try {
    // Get user's manager
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { reportingManagerId: true, fullName: true }
    });

    if (user?.reportingManagerId) {
      // Create notification for manager
      await prisma.notification.create({
        data: {
          userId: user.reportingManagerId,
          title: "Late Arrival Notification",
          message: `${user.fullName} arrived ${lateMinutes} minutes late today.`,
          type: "LATE_ARRIVAL",
        },
      });
    }

    // Log late arrival for reporting
    console.log(`Late arrival logged: Employee ${employeeId}, Late by ${lateMinutes} minutes`);
  } catch (error) {
    console.error("Error triggering late arrival notifications:", error);
  }
};

// Check for employees who haven't checked in by reminder time
const checkMissingCheckIns = async (req, res) => {
  try {
    const { role } = req.user;
    
    // Only HR, MD, and Managers can access this
    if (!["HR", "MD", "MANAGER"].includes(role)) {
      return res.status(403).json({
        error: "Forbidden: Only managers and above can check missing check-ins",
      });
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reminderTime = new Date(today);
    reminderTime.setHours(REMINDER_TIME_HOUR, REMINDER_TIME_MINUTE, 0, 0);

    // Only proceed if it's past reminder time
    if (now < reminderTime) {
      return res.json({
        message: "Too early to check missing check-ins",
        missingCheckIns: [],
      });
    }

    let whereClause = {};

    // Managers can only check their team
    if (role === "MANAGER") {
      const teamMembers = await prisma.user.findMany({
        where: { reportingManagerId: req.user.id },
        select: { id: true },
      });
      whereClause = {
        userId: { in: teamMembers.map(member => member.id) }
      };
    }

    // Get all employees who haven't checked in today
    const allEmployees = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, fullName: true, employeeId: true, reportingManagerId: true },
    });

    const checkedInEmployees = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        checkIn: { not: null },
      },
      select: { userId: true },
    });

    const checkedInIds = checkedInEmployees.map(emp => emp.userId);
    const missingCheckIns = allEmployees.filter(emp => !checkedInIds.includes(emp.id));

    // Create notifications for managers
    for (const employee of missingCheckIns) {
      if (employee.reportingManagerId) {
        await prisma.notification.create({
          data: {
            userId: employee.reportingManagerId,
            title: "Missing Check-in Alert",
            message: `${employee.fullName} has not checked in today (past ${REMINDER_TIME_HOUR}:${REMINDER_TIME_MINUTE.toString().padStart(2, '0')})`,
            type: "MISSING_CHECKIN",
          },
        });
      }
    }

    res.json({
      message: `Found ${missingCheckIns.length} employees who haven't checked in`,
      missingCheckIns: missingCheckIns.map(emp => ({
        id: emp.id,
        fullName: emp.fullName,
        employeeId: emp.employeeId,
      })),
    });
  } catch (error) {
    console.error("Check missing check-ins error:", error);
    res.status(500).json({
      error: "Failed to check missing check-ins",
      details: error.message,
    });
  }
};

// Get current user's attendance records
const getMyAttendance = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { limit = 30, offset = 0 } = req.query;

    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
      },
      orderBy: {
        date: "desc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        date: true,
        checkIn: true,
        checkOut: true,
        status: true,
        breakStart: true,
        breakEnd: true,
        breakMinutes: true,
        isLate: true,
        lateMinutes: true,
        checkInCount: true,
      },
    });

    res.json({
      count: attendances.length,
      attendances,
    });
  } catch (error) {
    console.error("Get my attendance error:", error);
    res.status(500).json({
      error: "Failed to fetch attendance records",
      details: error.message,
    });
  }
};

// Get monthly attendance
const getMonthlyAttendance = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { month, year, employeeId } = req.query;

    // Determine which user's attendance to fetch
    let targetUserId = userId;

    // HR and MD can view any employee's attendance
    if ((role === "HR" || role === "MD") && employeeId) {
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: { id: true },
      });
      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
        });
      }
      targetUserId = employeeId;
    } else if (role === "MANAGER" && employeeId) {
      // Manager can view only direct reports
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: { id: true, reportingManagerId: true },
      });
      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
        });
      }
      if (employee.reportingManagerId !== userId) {
        return res.status(403).json({
          error: "Forbidden: You can only view attendance of your direct reports",
        });
      }
      targetUserId = employeeId;
    }
    // Employee can only view their own attendance (default)

    // Get current month/year if not provided
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();

    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: targetUserId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "desc",
      },
      select: {
        id: true,
        date: true,
        checkIn: true,
        checkOut: true,
        status: true,
        breakStart: true,
        breakEnd: true,
        breakMinutes: true,
        isLate: true,
        lateMinutes: true,
        checkInCount: true,
      },
    });

    // Update status for records without check-in past 10 AM
    const currentTime = new Date();
    for (const attendance of attendances) {
      if (!attendance.checkIn && attendance.status !== "Absent") {
        const checkDate = new Date(attendance.date);
        checkDate.setHours(10, 0, 0, 0);
        if (now > checkDate) {
          await prisma.attendance.update({
            where: { id: attendance.id },
            data: { status: "Absent" },
          });
          attendance.status = "Absent";
        }
      }
    }

    const updatedAttendances = attendances;

    // Calculate statistics
    const stats = {
      totalDays: updatedAttendances.length,
      present: updatedAttendances.filter((a) => a.status === "Present").length,
      late: updatedAttendances.filter((a) => a.status === "Late").length,
      absent: updatedAttendances.filter((a) => a.status === "Absent").length,
      halfDay: updatedAttendances.filter((a) => a.status === "HalfDay").length,
      early: updatedAttendances.filter((a) => a.status === "Early").length,
      totalBreakMinutes: updatedAttendances.reduce((sum, a) => sum + (a.breakMinutes || 0), 0),
    };

    res.json({
      month: targetMonth,
      year: targetYear,
      statistics: stats,
      attendances: updatedAttendances,
    });
  } catch (error) {
    console.error("Get monthly attendance error:", error);
    res.status(500).json({
      error: "Failed to fetch monthly attendance",
      details: error.message,
    });
  }
};

// Get today's attendance record for logged-in user
const getTodayAttendance = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        checkIn: 'desc'
      }
    });

    if (!attendance || attendance.length === 0) {
      // Return pending status if no record found and it's before 10 AM
      const tenAM = new Date();
      tenAM.setHours(10, 0, 0, 0);
      const isPending = new Date() < tenAM;

      return res.json({
        date: today,
        status: isPending ? "Pending" : "Absent",
        checkIn: null,
        checkOut: null,
        breakStart: null,
        breakEnd: null,
        breakMinutes: 0,
        isLate: false,
        lateMinutes: 0,
        checkInCount: 0,
        totalBreakMinutes: 0,
        overtimeHours: 0,
        workingMinutes: 0
      });
    }

    // Return all sessions for today
    return res.json(attendance);
  } catch (error) {
    console.error("Get today's attendance error:", error);
    res.status(500).json({
      error: "Failed to fetch today's attendance",
      details: error.message,
    });
  }
};

// Get attendance summary for a date range
const getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
      dateFilter.lte.setHours(23, 59, 59, 999);
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        date: dateFilter,
      },
      include: {
        User: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Group by date and calculate statistics
    const summary = {};
    attendances.forEach((a) => {
      const dateStr = a.date.toISOString().split("T")[0];
      if (!summary[dateStr]) {
        summary[dateStr] = {
          date: dateStr,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          totalBreakMinutes: 0,
        };
      }
      summary[dateStr].total++;
      if (a.status === "Present" || a.status === "Late" || a.status === "HalfDay") {
        summary[dateStr].present++;
      } else if (a.status === "Absent") {
        summary[dateStr].absent++;
      }
      if (a.status === "Late") {
        summary[dateStr].late++;
      }
      summary[dateStr].totalBreakMinutes += a.breakMinutes || 0;
    });

    // Calculate overall summary
    const totalSummary = {
      presentCount: 0,
      absentCount: 0,
      leaveCount: 0,
      totalBreakMinutes: 0,
    };
    
    Object.values(summary).forEach(day => {
      totalSummary.presentCount += day.present;
      totalSummary.absentCount += day.absent;
      totalSummary.totalBreakMinutes += day.totalBreakMinutes;
    });

    res.json(totalSummary);
  } catch (error) {
    console.error("Get attendance summary error:", error);
    res.status(500).json({
      error: "Failed to fetch attendance summary",
      details: error.message,
    });
  }
};

const getAttendanceTimeline = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { date } = req.query; // Optional date parameter
    
    // Set target date (today or provided date)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    if (role === 'EMPLOYEE') {
      // Employee can only see their own timeline
      const attendance = await prisma.attendance.findFirst({
        where: {
          userId: userId,
          date: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              designation: true,
              role: true
            }
          }
        }
      });

      res.json({
        attendance: attendance || null
      });
    } else {
      // HR, MANAGER, MD can see all employees
      const attendances = await prisma.attendance.findMany({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              designation: true,
              role: true,
              department: true
            }
          }
        },
        orderBy: {
          user: {
            fullName: 'asc'
          }
        }
      });

      res.json({
        attendances: attendances
      });
    }
  } catch (error) {
    console.error('Get attendance timeline error:', error);
    res.status(500).json({
      error: 'Failed to fetch attendance timeline',
      details: error.message
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  resumeFromBreak,
  getMyAttendance,
  getMonthlyAttendance,
  getTodayAttendance,
  getAttendanceSummary,
  getAttendanceTimeline,
  getRecentAttendance,
  checkMissingCheckIns,
};
