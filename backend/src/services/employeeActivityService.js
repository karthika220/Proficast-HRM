const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class EmployeeActivityService {
  // Seed employee activity for last 7 days with dummy data
  static async seedEmployeeActivity(employeeId) {
    try {
      const today = new Date();
      const seedData = [];

      // Generate data for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0); // Set to start of day

        // Skip weekends (Saturday = 6, Sunday = 0)
        if (date.getDay() === 0 || date.getDay() === 6) {
          continue;
        }

        // Generate dummy check-in time (between 8:45 AM and 9:30 AM)
        const checkIn = new Date(date);
        checkIn.setHours(8 + Math.floor(Math.random() * 2), 45 + Math.floor(Math.random() * 45), 0, 0);

        // Generate dummy check-out time (between 5:30 PM and 7:00 PM)
        const checkOut = new Date(date);
        checkOut.setHours(17 + Math.floor(Math.random() * 2), 30 + Math.floor(Math.random() * 30), 0, 0);

        // Calculate working minutes (checkOut - checkIn - break)
        const totalMinutes = Math.round((checkOut - checkIn) / (1000 * 60));
        const breakMinutes = 45 + Math.floor(Math.random() * 30); // 45-75 minutes break
        const workingMinutes = Math.max(0, totalMinutes - breakMinutes);

        // Calculate overtime (if checkout after 6:45 PM)
        const officeEndTime = new Date(date);
        officeEndTime.setHours(18, 45, 0, 0);
        const overtimeMinutes = checkOut > officeEndTime ? Math.round((checkOut - officeEndTime) / (1000 * 60)) : 0;

        // Random status (mostly Present, some Late)
        const isLate = checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 0);
        const status = isLate ? 'Late' : 'Present';

        seedData.push({
          employeeId,
          date,
          checkIn,
          checkOut,
          breakMinutes,
          workingMinutes,
          overtimeMinutes,
          status,
        });
      }

      // Insert seed data
      if (seedData.length > 0) {
        await prisma.employeeActivity.createMany({
          data: seedData,
          skipDuplicates: true, // Avoid duplicates if already exists
        });
      }

      return seedData;
    } catch (error) {
      console.error('Error seeding employee activity:', error);
      throw error;
    }
  }

  // Upsert today's employee activity record
  static async upsertTodayActivity(employeeId, attendanceData) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day

      const {
        checkIn,
        checkOut,
        breakMinutes = 0,
        workingMinutes = 0,
        overtimeMinutes = 0,
        status = 'Present'
      } = attendanceData;

      const activityData = {
        employeeId,
        date: today,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        breakMinutes,
        workingMinutes,
        overtimeMinutes,
        status,
      };

      // Upsert the record
      const result = await prisma.employeeActivity.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date: today,
          },
        },
        update: activityData,
        create: activityData,
      });

      return result;
    } catch (error) {
      console.error('Error upserting today activity:', error);
      throw error;
    }
  }

  // Get employee activity with live fallback
  static async getEmployeeActivity(employeeId, userId, userRole) {
    try {
      // Get today's attendance first
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todayAttendance = await prisma.attendance.findFirst({
        where: {
          userId: employeeId,
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      // Get employee profile
      const employeeProfile = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          department: true,
          employeeId: true,
          reportingManagerId: true,
          User: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

      if (!employeeProfile) {
        throw new Error('Employee not found');
      }

      // Get current month activity (live if today has attendance, seeded otherwise)
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      let attendanceHistory;

      if (todayAttendance) {
        // Use live attendance data
        attendanceHistory = await prisma.attendance.findMany({
          where: {
            userId: employeeId,
            date: {
              gte: currentMonth,
              lt: nextMonth,
            },
          },
          orderBy: {
            date: 'desc',
          },
        });
      } else {
        // Use seeded employee activity data
        attendanceHistory = await prisma.employeeActivity.findMany({
          where: {
            employeeId: employeeProfile.employeeId,
            date: {
              gte: currentMonth,
              lt: nextMonth,
            },
          },
          orderBy: {
            date: 'desc',
          },
        });

        // Transform to match attendance structure
        attendanceHistory = attendanceHistory.map(record => ({
          id: record.id,
          date: record.date,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          breakMinutes: record.breakMinutes,
          workingMinutes: record.workingMinutes,
          overtimeMinutes: record.overtimeMinutes,
          status: record.status,
          totalBreakMinutes: record.breakMinutes,
        }));
      }

      // Calculate activity summary
      const activitySummary = {
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        leaveCount: 0,
        overtimeHours: 0,
      };

      attendanceHistory.forEach(record => {
        if (record.checkIn) {
          activitySummary.presentCount++;
          if (record.status === 'Late' || (record.isLate && record.isLate === true)) {
            activitySummary.lateCount++;
          }
          if (record.overtimeMinutes) {
            activitySummary.overtimeHours += record.overtimeMinutes / 60;
          }
        } else {
          if (record.status === 'ON_LEAVE') {
            activitySummary.leaveCount++;
          } else {
            activitySummary.absentCount++;
          }
        }
      });

      // Get leave history
      const leaveHistory = await prisma.leave.findMany({
        where: {
          userId: employeeId,
        },
        orderBy: {
          startDate: 'desc',
        },
        take: 10,
      });

      return {
        employeeProfile,
        todayAttendance: todayAttendance || null,
        attendanceHistory,
        activitySummary,
        leaveHistory,
      };
    } catch (error) {
      console.error('Error getting employee activity:', error);
      throw error;
    }
  }
}

module.exports = EmployeeActivityService;
