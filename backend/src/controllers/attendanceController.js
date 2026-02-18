const { PrismaClient } = require('@prisma/client');
const EscalationService = require('../services/escalationService');
const EmployeeActivityService = require('../services/employeeActivityService');

const prisma = new PrismaClient();

// Office timing constants
const OFFICE_START_HOUR = 9;
const OFFICE_START_MINUTE = 0;
const OFFICE_END_HOUR = 18;
const OFFICE_END_MINUTE = 45;
const LATE_THRESHOLD_MINUTES = 0; // After 9:00 AM is late
const REMINDER_TIME_HOUR = 9;
const REMINDER_TIME_MINUTE = 30;
const MAX_CHECKINS_PER_DAY = 4; // 2 main + 2 breaks
const LUNCH_BREAK_DURATION = 60; // 1 hour lunch break in minutes
const OVERTIME_START_HOUR = 18;
const OVERTIME_START_MINUTE = 45;
const LUNCH_BREAK_REMINDER_MINUTES = 60; // 1 hour reminder

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

// Helper function to check if check-in is late
const isLateCheckIn = (checkInTime) => {
  const checkIn = new Date(checkInTime);
  const officeStart = new Date(checkIn);
  officeStart.setHours(OFFICE_START_HOUR, OFFICE_START_MINUTE, 0, 0);
  
  return checkIn > officeStart;
};

// Helper function to calculate late minutes
const calculateLateMinutes = (checkInTime) => {
  const checkIn = new Date(checkInTime);
  const officeStart = new Date(checkIn);
  officeStart.setHours(OFFICE_START_HOUR, OFFICE_START_MINUTE, 0, 0);
  
  if (checkIn <= officeStart) return 0;
  
  return Math.round((checkIn - officeStart) / (1000 * 60));
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

// Check-in for the day with break tracking
const checkIn = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { checkInTime } = req.body; // Optional custom check-in time
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
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

    // Check if there's an active session (checked in but not checked out)
    const activeSession = existingAttendanceRecords.find(record => 
      record.checkIn && !record.checkOut
    );

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in. Please check out first.'
      });
    }

    const checkInDateTime = checkInTime ? new Date(checkInTime) : new Date();
    
    // Create attendance record with initial state
    const attendance = await prisma.attendance.create({
      data: {
        userId: userId,
        date: startOfDay,
        checkIn: checkInDateTime,
        status: 'WORKING',
        isLate: isLateCheckIn(checkInDateTime),
        lateMinutes: calculateLateMinutes(checkInDateTime),
        checkInCount: 1,
        employeeId: await getUserEmployeeId(userId),
        totalBreakMinutes: 0,
        breakMinutes: 0,
        overtimeHours: 0,
        updatedAt: new Date()
      }
    });
    
    // Check for escalations after check-in
    await EscalationService.checkAndCreateEscalations(userId);
    
    // Upsert employee activity record
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { employeeId: true }
      });
      
      if (user?.employeeId) {
        await EmployeeActivityService.upsertTodayActivity(user.employeeId, {
          checkIn: checkInDateTime,
          status: attendance.isLate ? 'Late' : 'Present'
        });
      }
    } catch (activityError) {
      console.warn('Failed to upsert employee activity:', activityError.message);
      // Don't fail check-in if activity upsert fails
    }
    
    res.json({
      success: true,
      message: 'Check-in successful',
      data: attendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check in'
    });
  }
};

// Check-out for the day with break tracking
const checkOut = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { checkoutType, breakType, permissionMinutes } = req.body;
    const checkoutTime = new Date();
    
    // Get today's attendance records (multiple sessions)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
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

    // Find the active session (checked in but not checked out)
    const activeSession = attendanceRecords.find(record => 
      record.checkIn && !record.checkOut
    );

    if (!activeSession) {
      return res.status(400).json({
        success: false,
        message: 'No active check-in session found. Please check in first.'
      });
    }

    // Check if user is currently on break and wants to resume work
    if (activeSession.breakStart && !activeSession.breakEnd) {
      // Resume from break - update break end time
      const breakEndTime = new Date();
      const breakDuration = Math.round((breakEndTime - new Date(activeSession.breakStart)) / (1000 * 60));
      
      attendance = await prisma.attendance.update({
        where: { id: activeSession.id },
        data: {
          breakEnd: breakEndTime,
          breakMinutes: (activeSession.breakMinutes || 0) + breakDuration,
          status: 'WORKING'
        }
      });

      return res.json({
        success: true,
        message: 'Resumed work successfully',
        data: attendance
      });
    }

    // BREAK CHECKOUT FLOW
    if (checkoutType === "BREAK") {
      const allowedBreakMinutes = breakType === "PERMISSION" ? (permissionMinutes || 30) : 60;
      
      // Calculate break duration from previous session if exists
      let totalBreakMinutes = activeSession.totalBreakMinutes || 0;
      
      // Find previous session to calculate break time
      const previousSessions = attendanceRecords.filter(record => 
        record.checkIn && record.checkOut && record.id !== activeSession.id
      );
      
      if (previousSessions.length > 0) {
        const lastSession = previousSessions[0];
        const breakDuration = Math.round((new Date(activeSession.checkIn) - new Date(lastSession.checkOut)) / (1000 * 60));
        totalBreakMinutes += breakDuration;
      }
      
      attendance = await prisma.attendance.update({
        where: { id: activeSession.id },
        data: {
          breakStart: checkoutTime,
          breakType: breakType,
          totalBreakMinutes: totalBreakMinutes,
          status: "ON_BREAK"
        }
      });

      return res.json({
        success: true,
        message: 'Break started successfully',
        data: attendance
      });
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
