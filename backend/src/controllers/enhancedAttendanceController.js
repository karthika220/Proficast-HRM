const prisma = require('../prismaClient');

// Office timing constants
const OFFICE_START_HOUR = 9;
const OFFICE_START_MINUTE = 0;
const GRACE_PERIOD_MINUTES = 10; // 10 minutes grace period
const OFFICE_END_HOUR = 18;
const OFFICE_END_MINUTE = 45;
const LATE_THRESHOLD_MINUTES = 0; // After 9:00 AM is late
const REMINDER_TIME_HOUR = 9;
const REMINDER_TIME_MINUTE = 30;
const MAX_CHECKINS_PER_DAY = 4; // 2 main + 2 breaks
const DEFAULT_BREAK_DURATION = 60; // 1 hour default break

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

// Helper function to create notification
const createNotification = async (userId, title, message, type) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Helper function to check for grace period usage
const checkGracePeriod = (checkInTime) => {
  const checkIn = new Date(checkInTime);
  const graceEnd = new Date(checkIn);
  graceEnd.setHours(OFFICE_START_HOUR, OFFICE_START_MINUTE + GRACE_PERIOD_MINUTES, 0, 0);
  
  return checkIn <= graceEnd;
};

// Helper function to trigger absence escalation
const triggerAbsenceEscalation = async (userId) => {
  try {
    // Check if user has 3+ absences in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const absences = await prisma.attendance.count({
      where: {
        userId,
        status: 'Absent',
        date: {
          gte: thirtyDaysAgo,
        },
      },
    });

    if (absences >= 3) {
      // Check if escalation already exists
      const existingEscalation = await prisma.escalation.findFirst({
        where: {
          userId,
          type: 'ABSENCE',
          status: {
            in: ['OPEN', 'IN_PROGRESS'],
          },
        },
      });

      if (!existingEscalation) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { fullName: true, reportingManagerId: true }
        });

        // Create escalation
        const escalation = await prisma.escalation.create({
          data: {
            userId,
            type: 'ABSENCE',
            severity: 'HIGH',
            description: `Employee has ${absences} absences in the last 30 days`,
            triggeredBy: 'SYSTEM',
          },
        });

        // Notify manager
        if (user?.reportingManagerId) {
          await createNotification(
            user.reportingManagerId,
            'Absence Escalation',
            `${user.fullName} has reached ${absences} absences. Escalation created.`,
            'ESCALATION'
          );
        }

        // Notify HR
        const hrUsers = await prisma.user.findMany({
          where: { role: 'HR' },
          select: { id: true }
        });

        for (const hr of hrUsers) {
          await createNotification(
            hr.id,
            'Absence Escalation',
            `${user.fullName} has reached ${absences} absences. Escalation created.`,
            'ESCALATION'
          );
        }

        console.log(`Absence escalation created for user ${userId}: ${absences} absences`);
      }
    }
  } catch (error) {
    console.error('Error triggering absence escalation:', error);
  }
};

// Check-in for the day with break tracking and grace period
const checkIn = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get user's employee ID
    const employeeId = await getUserEmployeeId(userId);

    // Find today's attendance record
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const checkInTime = new Date();
    let attendance;

    // Check if this is a break check-in (already checked in and checked out once)
    if (existingAttendance && existingAttendance.checkIn && existingAttendance.checkOut && !existingAttendance.breakEnd) {
      // This is a break end check-in
      const breakMinutes = calculateBreakMinutes(existingAttendance.breakStart, checkInTime);
      
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          breakEnd: checkInTime,
          breakMinutes: (existingAttendance.breakMinutes || 0) + breakMinutes,
          checkInCount: existingAttendance.checkInCount + 1,
        },
      });

      return res.status(201).json({
        message: "Break ended successfully",
        attendance: {
          id: attendance.id,
          date: attendance.date,
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          breakStart: attendance.breakStart,
          breakEnd: attendance.breakEnd,
          breakMinutes: attendance.breakMinutes,
          status: attendance.status,
        },
      });
    }

    // Check if already checked in today and not checked out
    if (existingAttendance && existingAttendance.checkIn && !existingAttendance.checkOut) {
      return res.status(400).json({
        error: "Already checked in for today",
        attendance: {
          id: existingAttendance.id,
          checkIn: existingAttendance.checkIn,
          status: existingAttendance.status,
        },
      });
    }

    // Check maximum check-ins per day
    if (existingAttendance && existingAttendance.checkInCount >= MAX_CHECKINS_PER_DAY) {
      return res.status(400).json({
        error: `Maximum check-ins per day (${MAX_CHECKINS_PER_DAY}) exceeded`,
      });
    }

    // Calculate late status and minutes
    const late = isLateCheckIn(checkInTime);
    const lateMinutes = calculateLateMinutes(checkInTime);
    const gracePeriodUsed = checkGracePeriod(checkInTime);

    if (existingAttendance) {
      // Update existing record
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkIn: checkInTime,
          isLate: late,
          lateMinutes: lateMinutes,
          gracePeriodUsed: gracePeriodUsed,
          checkInCount: existingAttendance.checkInCount + 1,
          employeeId: employeeId,
          status: calculateStatus(checkInTime, null, today),
        },
      });
    } else {
      // Create new attendance record
      attendance = await prisma.attendance.create({
        data: {
          userId,
          date: today,
          checkIn: checkInTime,
          isLate: late,
          lateMinutes: lateMinutes,
          gracePeriodUsed: gracePeriodUsed,
          checkInCount: 1,
          employeeId: employeeId,
          status: calculateStatus(checkInTime, null, today),
        },
      });
    }

    // Trigger late arrival notifications if needed
    if (late) {
      await triggerLateArrivalNotifications(userId, employeeId, lateMinutes);
    }

    // Send grace period reminder if applicable
    if (gracePeriodUsed && late) {
      await createNotification(
        userId,
        'Late Check-in',
        `You checked in ${lateMinutes} minutes late today.`,
        'LATE_ARRIVAL'
      );
    }

    res.status(201).json({
      message: gracePeriodUsed && !late ? "Checked in within grace period" : 
               late ? "Checked in successfully (Late)" : "Checked in successfully",
      attendance: {
        id: attendance.id,
        date: attendance.date,
        checkIn: attendance.checkIn,
        isLate: attendance.isLate,
        lateMinutes: attendance.lateMinutes,
        gracePeriodUsed: attendance.gracePeriodUsed,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      error: "Failed to check in",
      details: error.message,
    });
  }
};

// Check-out for the day with break tracking
const checkOut = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (!attendance) {
      return res.status(400).json({
        error: "No check-in found for today. Please check in first.",
      });
    }

    if (!attendance.checkIn) {
      return res.status(400).json({
        error: "No check-in found for today. Please check in first.",
      });
    }

    const checkOutTime = new Date();

    // Check if this is a break start (before office end time and already checked in)
    if (!attendance.checkOut && isBeforeOfficeEnd(checkOutTime) && !attendance.breakStart) {
      // This is a break start
      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          breakStart: checkOutTime,
        },
      });

      // Schedule break reminder after 1 hour
      setTimeout(async () => {
        await createNotification(
          userId,
          'Break Reminder',
          'Your break time is ending soon. Please check back in.',
          'BREAK_REMINDER'
        );
      }, DEFAULT_BREAK_DURATION * 60 * 1000);

      return res.json({
        message: "Break started successfully",
        attendance: {
          id: updatedAttendance.id,
          date: updatedAttendance.date,
          checkIn: updatedAttendance.checkIn,
          breakStart: updatedAttendance.breakStart,
          status: updatedAttendance.status,
        },
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        error: "Already checked out for today",
        attendance: {
          id: attendance.id,
          checkOut: attendance.checkOut,
          status: attendance.status,
        },
      });
    }

    const updatedStatus = calculateStatus(
      attendance.checkIn,
      checkOutTime,
      attendance.date
    );

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: checkOutTime,
        status: updatedStatus,
      },
    });

    res.json({
      message: "Checked out successfully",
      attendance: {
        id: updatedAttendance.id,
        date: updatedAttendance.date,
        checkIn: updatedAttendance.checkIn,
        checkOut: updatedAttendance.checkOut,
        breakMinutes: updatedAttendance.breakMinutes,
        status: updatedAttendance.status,
      },
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({
      error: "Failed to check out",
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
      await createNotification(
        user.reportingManagerId,
        'Late Arrival Notification',
        `${user.fullName} arrived ${lateMinutes} minutes late today.`,
        'LATE_ARRIVAL'
      );
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

    // Create notifications for managers and trigger escalations
    for (const employee of missingCheckIns) {
      // Send grace period reminder to employee
      await createNotification(
        employee.id,
        'Check-in Reminder',
        `You have not checked in today. Please check in as soon as possible.`,
        'MISSING_CHECKIN'
      );

      if (employee.reportingManagerId) {
        await createNotification(
          employee.reportingManagerId,
          'Missing Check-in Alert',
          `${employee.fullName} has not checked in today (past ${REMINDER_TIME_HOUR}:${REMINDER_TIME_MINUTE.toString().padStart(2, '0')})`,
          'MISSING_CHECKIN'
        );
      }

      // Check for absence escalation
      await triggerAbsenceEscalation(employee.id);
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
        gracePeriodUsed: true,
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
        gracePeriodUsed: true,
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
      gracePeriodUsed: updatedAttendances.filter((a) => a.gracePeriodUsed).length,
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

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
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
        gracePeriodUsed: true,
      },
    });

    if (!attendance) {
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
        gracePeriodUsed: false,
      });
    }

    res.json(attendance);
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
        user: {
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
          gracePeriodUsed: 0,
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
      if (a.gracePeriodUsed) {
        summary[dateStr].gracePeriodUsed++;
      }
      summary[dateStr].totalBreakMinutes += a.breakMinutes || 0;
    });

    // Calculate overall summary
    const totalSummary = {
      presentCount: 0,
      absentCount: 0,
      leaveCount: 0,
      totalBreakMinutes: 0,
      gracePeriodUsed: 0,
    };
    
    Object.values(summary).forEach(day => {
      totalSummary.presentCount += day.present;
      totalSummary.absentCount += day.absent;
      totalSummary.totalBreakMinutes += day.totalBreakMinutes;
      totalSummary.gracePeriodUsed += day.gracePeriodUsed;
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

module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getMonthlyAttendance,
  getTodayAttendance,
  getAttendanceSummary,
  getRecentAttendance,
  checkMissingCheckIns,
};
