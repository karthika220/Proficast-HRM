const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class LeaveService {
  // Leave policies
  static CASUAL_LEAVE_PER_YEAR = 8;
  static SICK_LEAVE_PER_YEAR = 8;
  
  /**
   * Get live leave balance for an employee
   */
  static async getLeaveBalance(userId) {
    try {
      const currentYear = new Date().getFullYear();
      
      let leaveBalance = await prisma.leaveBalance.findFirst({
        where: {
          userId,
          leaveYear: currentYear
        }
      });
      
      // If no balance record exists, create one based on joining date
      if (!leaveBalance) {
        leaveBalance = await this.initializeLeaveBalance(userId);
      }
      
      // Calculate live balance
      const casualRemaining = Math.max(0, leaveBalance.casual - leaveBalance.casualUsed);
      const sickRemaining = Math.max(0, leaveBalance.sick - leaveBalance.sickUsed);
      
      return {
        casual: {
          total: leaveBalance.casual,
          used: leaveBalance.casualUsed,
          remaining: casualRemaining,
          display: `${casualRemaining} / ${leaveBalance.casual}`
        },
        sick: {
          total: leaveBalance.sick,
          used: leaveBalance.sickUsed,
          remaining: sickRemaining,
          display: `${sickRemaining} / ${leaveBalance.sick}`
        },
        lastUpdated: leaveBalance.lastUpdated
      };
    } catch (error) {
      console.error('Error getting leave balance:', error);
      throw new Error('Failed to get leave balance');
    }
  }

  /**
   * Initialize leave balance based on employee joining date
   */
  static async initializeLeaveBalance(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          dateOfJoining: true,
          leaveBalance: {
            where: {
              leaveYear: new Date().getFullYear()
            }
          }
        }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const currentYear = new Date().getFullYear();
      const joinYear = user.dateOfJoining ? new Date(user.dateOfJoining).getFullYear() : currentYear;
      
      // Pro-rated leave calculation based on joining date
      let casualLeave = this.CASUAL_LEAVE_PER_YEAR;
      let sickLeave = this.SICK_LEAVE_PER_YEAR;
      
      if (joinYear === currentYear && user.dateOfJoining) {
        const joinDate = new Date(user.dateOfJoining);
        const yearEnd = new Date(currentYear, 11, 31); // December 31
        const daysInYear = (yearEnd - new Date(currentYear, 0, 1)) / (1000 * 60 * 60 * 24);
        const daysWorked = (yearEnd - joinDate) / (1000 * 60 * 60 * 24);
        
        const prorationRatio = daysWorked / daysInYear;
        casualLeave = Math.floor(casualLeave * prorationRatio);
        sickLeave = Math.floor(sickLeave * prorationRatio);
      }
      
      const leaveBalance = await prisma.leaveBalance.create({
        data: {
          userId,
          casual: casualLeave,
          sick: sickLeave,
          casualUsed: 0,
          sickUsed: 0,
          yearJoined: joinYear,
          leaveYear: currentYear,
          lastUpdated: new Date()
        }
      });
      
      return leaveBalance;
    } catch (error) {
      console.error('Error initializing leave balance:', error);
      throw new Error('Failed to initialize leave balance');
    }
  }

  /**
   * Submit leave request with live balance validation
   */
  static async submitLeaveRequest(userId, leaveData) {
    try {
      const { type, startDate, endDate, reason } = leaveData;
      
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        throw new Error('Start date cannot be after end date');
      }
      
      // Calculate leave days (excluding weekends)
      const leaveDays = this.calculateLeaveDays(start, end);
      
      // Check leave balance
      const balance = await this.getLeaveBalance(userId);
      const availableBalance = type === 'CL' ? balance.casual.remaining : balance.sick.remaining;
      
      if (leaveDays > availableBalance) {
        throw new Error(`Insufficient leave balance. Available: ${availableBalance} days, Requested: ${leaveDays} days`);
      }
      
      // Create leave request
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          userId,
          type,
          startDate: start,
          endDate: end,
          days: leaveDays,
          reason,
          status: 'PendingManager'
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              reportingManager: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              }
            }
          }
        }
      });
      
      // Send notifications to HR and manager
      await this.sendLeaveRequestNotifications(leaveRequest);
      
      return leaveRequest;
    } catch (error) {
      console.error('Error submitting leave request:', error);
      throw error;
    }
  }

  /**
   * Calculate leave days (excluding weekends)
   */
  static calculateLeaveDays(startDate, endDate) {
    let days = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Saturday and Sunday
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  /**
   * Approve or reject leave request
   */
  static async updateLeaveStatus(leaveRequestId, status, approvedBy, rejectionReason = null) {
    try {
      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          }
        }
      });
      
      if (!leaveRequest) {
        throw new Error('Leave request not found');
      }
      
      const updateData = {
        status,
        rejectionReason
      };
      
      // Update approval flags based on status
      if (status === 'Approved') {
        if (leaveRequest.status === 'PendingManager') {
          updateData.approvedByManager = true;
        } else if (leaveRequest.status === 'PendingHR') {
          updateData.approvedByHR = true;
        } else if (leaveRequest.status === 'PendingMD') {
          updateData.approvedByMD = true;
        }
        updateData.approvedBy = approvedBy;
        
        // Deduct from leave balance when fully approved
        await this.deductLeaveBalance(leaveRequest.userId, leaveRequest.type, leaveRequest.days);
      }
      
      const updatedRequest = await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: updateData,
        include: {
          user: {
            select: {
              fullName: true,
              email: true
            }
          }
        }
      });
      
      // Notify employee about status change
      await this.sendLeaveStatusNotification(updatedRequest);
      
      return updatedRequest;
    } catch (error) {
      console.error('Error updating leave status:', error);
      throw new Error('Failed to update leave status');
    }
  }

  /**
   * Deduct leave from balance
   */
  static async deductLeaveBalance(userId, leaveType, days) {
    try {
      const currentYear = new Date().getFullYear();
      
      const leaveBalance = await prisma.leaveBalance.findFirst({
        where: {
          userId,
          leaveYear: currentYear
        }
      });
      
      if (!leaveBalance) {
        throw new Error('Leave balance not found');
      }
      
      const updateData = {
        lastUpdated: new Date()
      };
      
      if (leaveType === 'CL') {
        updateData.casualUsed = leaveBalance.casualUsed + days;
      } else if (leaveType === 'SL') {
        updateData.sickUsed = leaveBalance.sickUsed + days;
      }
      
      await prisma.leaveBalance.update({
        where: { id: leaveBalance.id },
        data: updateData
      });
      
    } catch (error) {
      console.error('Error deducting leave balance:', error);
      throw new Error('Failed to deduct leave balance');
    }
  }

  /**
   * Get leave requests for HR view
   */
  static async getLeaveRequestsForHR(status = null) {
    try {
      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }
      
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              employeeId: true,
              department: true,
              reportingManager: {
                select: {
                  fullName: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Add live balance for each request
      const requestsWithBalance = await Promise.all(
        leaveRequests.map(async (request) => {
          const balance = await this.getLeaveBalance(request.userId);
          return {
            ...request,
            leaveBalance: balance
          };
        })
      );
      
      return requestsWithBalance;
    } catch (error) {
      console.error('Error getting leave requests for HR:', error);
      throw new Error('Failed to get leave requests');
    }
  }

  /**
   * Get leave requests for manager (only their team)
   */
  static async getLeaveRequestsForManager(managerId, status = null) {
    try {
      const whereClause = {
        user: {
          reportingManagerId: managerId
        }
      };
      
      if (status) {
        whereClause.status = status;
      }
      
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              employeeId: true,
              department: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return leaveRequests;
    } catch (error) {
      console.error('Error getting leave requests for manager:', error);
      throw new Error('Failed to get leave requests');
    }
  }

  /**
   * Send notifications for new leave request
   */
  static async sendLeaveRequestNotifications(leaveRequest) {
    try {
      // Notify HR users
      const hrUsers = await prisma.user.findMany({
        where: { role: 'HR' },
        select: { id: true, email: true }
      });
      
      for (const hrUser of hrUsers) {
        await prisma.notification.create({
          data: {
            userId: hrUser.id,
            title: 'New Leave Request',
            message: `${leaveRequest.user.fullName} has requested ${leaveRequest.days} days of ${leaveRequest.type} leave.`,
            type: 'LEAVE_REQUEST',
            emailTo: hrUser.email
          }
        });
      }
      
      // Notify reporting manager
      if (leaveRequest.user.reportingManager) {
        await prisma.notification.create({
          data: {
            userId: leaveRequest.user.reportingManager.id,
            title: 'Team Member Leave Request',
            message: `${leaveRequest.user.fullName} has requested ${leaveRequest.days} days of ${leaveRequest.type} leave.`,
            type: 'LEAVE_REQUEST',
            emailTo: leaveRequest.user.reportingManager.email
          }
        });
      }
      
    } catch (error) {
      console.error('Error sending leave request notifications:', error);
    }
  }

  /**
   * Send notification about leave status change
   */
  static async sendLeaveStatusNotification(leaveRequest) {
    try {
      const statusText = leaveRequest.status === 'Approved' ? 'approved' : 'rejected';
      
      await prisma.notification.create({
        data: {
          userId: leaveRequest.userId,
          title: `Leave Request ${statusText}`,
          message: `Your leave request for ${leaveRequest.days} days has been ${statusText}.`,
          type: 'LEAVE_REQUEST'
        }
      });
      
    } catch (error) {
      console.error('Error sending leave status notification:', error);
    }
  }

  /**
   * Get leave statistics
   */
  static async getLeaveStats(timePeriod = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timePeriod);
      
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      });
      
      const stats = {
        total: leaveRequests.length,
        approved: leaveRequests.filter(lr => lr.status === 'Approved').length,
        rejected: leaveRequests.filter(lr => lr.status === 'Rejected').length,
        pending: leaveRequests.filter(lr => 
          ['PendingManager', 'PendingHR', 'PendingMD'].includes(lr.status)
        ).length,
        byType: {
          casual: leaveRequests.filter(lr => lr.type === 'CL').length,
          sick: leaveRequests.filter(lr => lr.type === 'SL').length,
          unpaid: leaveRequests.filter(lr => lr.type === 'UL').length
        },
        totalDays: leaveRequests.reduce((sum, lr) => sum + lr.days, 0)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting leave stats:', error);
      throw new Error('Failed to get leave statistics');
    }
  }
}

module.exports = LeaveService;
