const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AttendanceService {
  // Office configuration
  static OFFICE_START_TIME = '09:00';
  static GRACE_PERIOD_MINUTES = 10;
  static LUNCH_BREAK_DURATION = 60; // minutes
  static LUNCH_BREAK_START = '13:00'; // Default lunch start time
  static DEFAULT_PERMISSION_MINUTES = 30; // Default permission break duration

  /**
   * Get default permission minutes from system settings
   */
  static async getDefaultPermissionMinutes() {
    try {
      // Try to get from system settings table first
      const setting = await prisma.systemSettings.findUnique({
        where: { key: 'permission_default_minutes' }
      });
      
      if (setting) {
        return parseInt(setting.value);
      }
      
      // If no setting exists, return default
      return this.DEFAULT_PERMISSION_MINUTES;
    } catch (error) {
      console.log('System settings table not found, using default permission minutes');
      return this.DEFAULT_PERMISSION_MINUTES;
    }
  }

  /**
   * Set default permission minutes (admin function)
   */
  static async setDefaultPermissionMinutes(minutes) {
    try {
      // Validate minutes
      const validation = this.validatePermissionMinutes(minutes);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Try to update system settings
      const setting = await prisma.systemSettings.upsert({
        where: { key: 'permission_default_minutes' },
        update: { value: minutes.toString() },
        create: {
          key: 'permission_default_minutes',
          value: minutes.toString(),
          description: 'Default permission break duration in minutes'
        }
      });
      
      return { success: true, minutes: parseInt(setting.value) };
    } catch (error) {
      console.log('System settings table not found, permission minutes not saved');
      return { success: false, message: 'System settings not available' };
    }
  }

  /**
   * Validate permission minutes
   */
  static validatePermissionMinutes(minutes) {
    const mins = parseInt(minutes);
    
    if (isNaN(mins)) {
      return { valid: false, message: 'Permission minutes must be a number' };
    }
    
    if (mins < 1) {
      return { valid: false, message: 'Permission minutes must be at least 1' };
    }
    
    if (mins > 480) { // Max 8 hours
      return { valid: false, message: 'Permission minutes cannot exceed 480 (8 hours)' };
    }
    
    return { valid: true };
  }

  /**
   * Calculate break duration based on type
   */
  static async calculateBreakDuration(breakType, customMinutes = null) {
    switch (breakType) {
      case 'LUNCH':
        return this.LUNCH_BREAK_DURATION; // 1 hour for lunch
      case 'PERMISSION':
        if (customMinutes) {
          const validation = this.validatePermissionMinutes(customMinutes);
          if (!validation.valid) {
            throw new Error(validation.message);
          }
          return customMinutes;
        }
        return await this.getDefaultPermissionMinutes();
      default:
        return this.LUNCH_BREAK_DURATION;
    }
  }

  /**
   * Format minutes to Xh Ym format
   */
  static formatMinutes(minutes) {
    if (minutes <= 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }

  /**
   * Check in employee with grace period logic
   */
  static async checkIn(userId, checkInTime = new Date()) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const checkInHour = checkInTime.getHours();
      const checkInMinute = checkInTime.getMinutes();
      const totalMinutes = checkInHour * 60 + checkInMinute;
      
      // Office start time in minutes (9:00 AM = 540 minutes)
      const officeStartMinutes = 9 * 60;
      const gracePeriodEnd = officeStartMinutes + this.GRACE_PERIOD_MINUTES;
      
      let isLate = false;
      let lateMinutes = 0;
      let gracePeriodUsed = false;
      
      // Check if late
      if (totalMinutes > officeStartMinutes) {
        isLate = true;
        lateMinutes = totalMinutes - officeStartMinutes;
        
        // Check if within grace period
        if (totalMinutes <= gracePeriodEnd) {
          gracePeriodUsed = true;
        }
      }
      
      // Create or update attendance record
      const attendance = await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId: userId,
            date: new Date(today)
          }
        },
        update: {
          checkIn: checkInTime,
          status: 'PRESENT',
          isLate,
          lateMinutes,
          gracePeriodUsed,
          checkInCount: {
            increment: 1
          }
        },
        create: {
          userId,
          date: new Date(today),
          checkIn: checkInTime,
          status: 'PRESENT',
          isLate,
          lateMinutes,
          gracePeriodUsed,
          checkInCount: 1
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          }
        }
      });
      
      // Send late notification if applicable
      if (isLate && totalMinutes > gracePeriodEnd) {
        await this.sendLateNotification(attendance);
      }
      
      return attendance;
    } catch (error) {
      console.error('Error checking in:', error);
      throw new Error('Failed to check in');
    }
  }

  /**
   * Check out or start break
   */
  static async checkOut(userId, checkOutTime = new Date()) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const checkOutHour = checkOutTime.getHours();
      
      // If check out is during lunch hours (12:00-14:00), treat as break start
      if (checkOutHour >= 12 && checkOutHour <= 14) {
        return await this.startBreak(userId, checkOutTime, 'LUNCH');
      }
      
      // Calculate total work hours excluding break time
      const attendance = await prisma.attendance.findFirst({
        where: {
          userId,
          date: new Date(today)
        }
      });
      
      if (!attendance || !attendance.checkIn) {
        throw new Error('No check-in record found for today');
      }
      
      const totalWorkHours = this.calculateWorkHours(attendance.checkIn, checkOutTime, attendance.breakMinutes);
      
      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOut: checkOutTime,
          totalWorkHours,
          status: 'PRESENT'
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          }
        }
      });
      
      return updatedAttendance;
    } catch (error) {
      console.error('Error checking out:', error);
      throw new Error('Failed to check out');
    }
  }

  /**
   * Start break (lunch or short break)
   */
  static async startBreak(userId, breakStartTime = new Date(), breakType = 'LUNCH') {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const attendance = await prisma.attendance.update({
        where: {
          userId_date: {
            userId: userId,
            date: new Date(today)
          }
        },
        data: {
          breakStart: breakStartTime,
          breakType
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          }
        }
      });
      
      // Schedule break reminder after 1 hour for lunch breaks
      if (breakType === 'LUNCH') {
        setTimeout(() => {
          this.sendBreakReminder(attendance);
        }, this.LUNCH_BREAK_DURATION * 60 * 1000);
      }
      
      return attendance;
    } catch (error) {
      console.error('Error starting break:', error);
      throw new Error('Failed to start break');
    }
  }

  /**
   * End break and resume work
   */
  static async endBreak(userId, breakEndTime = new Date()) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const attendance = await prisma.attendance.findFirst({
        where: {
          userId,
          date: new Date(today)
        }
      });
      
      if (!attendance || !attendance.breakStart) {
        throw new Error('No break in progress');
      }
      
      const breakMinutes = (breakEndTime - attendance.breakStart) / (1000 * 60);
      
      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          breakEnd: breakEndTime,
          breakMinutes: Math.round(breakMinutes),
          breakReminderSent: true
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          }
        }
      });
      
      return updatedAttendance;
    } catch (error) {
      console.error('Error ending break:', error);
      throw new Error('Failed to end break');
    }
  }

  /**
   * Calculate work hours excluding break time
   */
  static calculateWorkHours(checkIn, checkOut, breakMinutes = 0) {
    const workMinutes = (checkOut - checkIn) / (1000 * 60);
    const actualWorkMinutes = Math.max(0, workMinutes - breakMinutes);
    return Math.round((actualWorkMinutes / 60) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Send late notification to employee
   */
  static async sendLateNotification(attendance) {
    try {
      if (attendance.lateNotificationSent) return;
      
      await prisma.notification.create({
        data: {
          userId: attendance.userId,
          title: 'Late Arrival Notification',
          message: `You checked in ${attendance.lateMinutes} minutes late today. Please ensure timely arrival.`,
          type: 'LATE_ARRIVAL'
        }
      });
      
      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { lateNotificationSent: true }
      });
    } catch (error) {
      console.error('Error sending late notification:', error);
    }
  }

  /**
   * Send break reminder
   */
  static async sendBreakReminder(attendance) {
    try {
      if (attendance.breakReminderSent) return;
      
      await prisma.notification.create({
        data: {
          userId: attendance.userId,
          title: 'Break Reminder',
          message: 'Your lunch break is over. Please check back in to resume work.',
          type: 'BREAK_REMINDER'
        }
      });
      
      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { breakReminderSent: true }
      });
    } catch (error) {
      console.error('Error sending break reminder:', error);
    }
  }

  /**
   * Get attendance statistics for a user
   */
  static async getAttendanceStats(userId, startDate, endDate) {
    try {
      const attendances = await prisma.attendance.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          }
        }
      });
      
      const stats = {
        totalDays: attendances.length,
        presentDays: attendances.filter(a => a.status === 'PRESENT').length,
        absentDays: attendances.filter(a => a.status === 'ABSENT').length,
        lateDays: attendances.filter(a => a.isLate).length,
        averageWorkHours: attendances.reduce((sum, a) => sum + (a.totalWorkHours || 0), 0) / attendances.length,
        totalBreakMinutes: attendances.reduce((sum, a) => sum + (a.breakMinutes || 0), 0)
      };
      
      return { stats, attendances };
    } catch (error) {
      console.error('Error getting attendance stats:', error);
      throw new Error('Failed to get attendance statistics');
    }
  }
}

module.exports = AttendanceService;
