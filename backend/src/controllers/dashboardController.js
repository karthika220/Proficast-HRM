const prisma = require('../prismaClient');

const stats = async (req, res) => {
  const total = await prisma.user.count();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const present = await prisma.attendance.count({ where: { date: startOfDay } });
  const late = await prisma.attendance.count({ where: { date: startOfDay, status: 'Late' } });
  const onLeave = await prisma.leaveRequest.count({ where: { status: 'APPROVED', fromDate: { lte: startOfDay }, toDate: { gte: startOfDay } } });
  const absent = Math.max(0, total - present - onLeave);
  res.json({ total, present, late, onLeave, absent });
};

// Enhanced real-time attendance for HR dashboard
const getTodayAttendanceLive = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get all attendance records for today with user details
    const attendanceRecords = await prisma.attendance.findMany({
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
            email: true,
            employeeId: true,
            department: true,
            designation: true,
            reportingManager: {
              select: {
                fullName: true
              }
            }
          }
        }
      },
      orderBy: {
        user: {
          fullName: 'asc'
        }
      }
    });

    // Get all active employees
    const allEmployees = await prisma.user.findMany({
      where: {
        status: 'Active'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        employeeId: true,
        department: true,
        designation: true,
        reportingManager: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // Merge attendance data with employee list
    const employeesWithAttendance = allEmployees.map(employee => {
      const attendance = attendanceRecords.find(record => record.userId === employee.id);
      
      if (!attendance) {
        // No attendance record today - check if on leave
        return {
          ...employee,
          attendance: {
            status: 'ABSENT',
            checkIn: null,
            checkOut: null,
            totalWorkHours: 0,
            breakMinutes: 0,
            isLate: false,
            lateMinutes: 0
          }
        };
      }

      return {
        ...employee,
        attendance: {
          status: attendance.status,
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          totalWorkHours: attendance.totalWorkHours || 0,
          breakMinutes: attendance.breakMinutes || 0,
          isLate: attendance.isLate || false,
          lateMinutes: attendance.lateMinutes || 0,
          breakStart: attendance.breakStart,
          breakEnd: attendance.breakEnd,
          gracePeriodUsed: attendance.gracePeriodUsed || false
        }
      };
    });

    // Calculate summary statistics
    const summary = {
      totalEmployees: allEmployees.length,
      present: employeesWithAttendance.filter(emp => 
        emp.attendance.status === 'PRESENT' || emp.attendance.checkIn
      ).length,
      absent: employeesWithAttendance.filter(emp => 
        emp.attendance.status === 'ABSENT' && !emp.attendance.checkIn
      ).length,
      late: employeesWithAttendance.filter(emp => emp.attendance.isLate).length,
      onBreak: employeesWithAttendance.filter(emp => 
        emp.attendance.breakStart && !emp.attendance.breakEnd
      ).length
    };

    res.json({
      summary,
      employees: employeesWithAttendance,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching live attendance:', error);
    res.status(500).json({
      error: 'Failed to fetch attendance data',
      message: error.message
    });
  }
};

const todayAttendance = async (req, res) => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const records = await prisma.attendance.findMany({ where: { date: startOfDay }, include: { user: true } });
  res.json(records);
};

module.exports = { stats, todayAttendance, getTodayAttendanceLive };
