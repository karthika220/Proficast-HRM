const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class EscalationService {
  // Escalation thresholds
  static ABSENCE_THRESHOLD = 3; // Create escalation after 3 absences
  static LATE_THRESHOLD = 5; // Create escalation after 5 late arrivals
  
  /**
   * Check and create escalations based on attendance patterns
   */
  static async checkAndCreateEscalations(userId, timePeriod = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timePeriod);
      
      const attendances = await prisma.attendance.findMany({
        where: {
          userId,
          date: {
            gte: startDate
          }
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
      
      const absentDays = attendances.filter(a => a.status === 'ABSENT').length;
      const lateDays = attendances.filter(a => a.isLate).length;
      
      // Check for absence escalation
      if (absentDays >= this.ABSENCE_THRESHOLD) {
        await this.createEscalation(userId, 'ABSENCE', absentDays);
      }
      
      // Check for lateness escalation
      if (lateDays >= this.LATE_THRESHOLD) {
        await this.createEscalation(userId, 'LATENESS', lateDays);
      }
      
      return {
        absentDays,
        lateDays,
        absenceEscalation: absentDays >= this.ABSENCE_THRESHOLD,
        latenessEscalation: lateDays >= this.LATE_THRESHOLD
      };
    } catch (error) {
      console.error('Error checking escalations:', error);
      throw new Error('Failed to check escalations');
    }
  }

  /**
   * Create escalation for employee
   */
  static async createEscalation(userId, type, count) {
    try {
      // Check if escalation already exists for this type and user
      const existingEscalation = await prisma.escalation.findFirst({
        where: {
          userId,
          type,
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        }
      });
      
      if (existingEscalation) {
        return existingEscalation; // Don't create duplicate escalations
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          reportingManager: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });
      
      const severity = this.calculateSeverity(type, count);
      const description = this.generateDescription(type, count);
      
      const escalation = await prisma.escalation.create({
        data: {
          userId,
          type,
          severity,
          description,
          triggeredBy: 'SYSTEM',
          absenceCount: type === 'ABSENCE' ? count : null,
          lateCount: type === 'LATENESS' ? count : null
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
      
      // Send notifications
      await this.sendEscalationNotifications(escalation, user);
      
      return escalation;
    } catch (error) {
      console.error('Error creating escalation:', error);
      throw new Error('Failed to create escalation');
    }
  }

  /**
   * Calculate severity based on count
   */
  static calculateSeverity(type, count) {
    if (type === 'ABSENCE') {
      if (count >= 5) return 'HIGH';
      if (count >= 3) return 'MEDIUM';
      return 'LOW';
    }
    
    if (type === 'LATENESS') {
      if (count >= 10) return 'HIGH';
      if (count >= 5) return 'MEDIUM';
      return 'LOW';
    }
    
    return 'LOW';
  }

  /**
   * Generate escalation description
   */
  static generateDescription(type, count) {
    if (type === 'ABSENCE') {
      return `Employee has ${count} absences in the last 30 days. Review required.`;
    }
    
    if (type === 'LATENESS') {
      return `Employee has been late ${count} times in the last 30 days. Review required.`;
    }
    
    return 'Performance review required.';
  }

  /**
   * Send escalation notifications to employee, HR, and manager
   */
  static async sendEscalationNotifications(escalation, user) {
    try {
      // Notification to employee
      await prisma.notification.create({
        data: {
          userId: escalation.userId,
          title: 'Escalation Created',
          message: `An escalation has been created regarding your ${escalation.type.toLowerCase()}. Please contact HR.`,
          type: 'ESCALATION',
          emailTo: user.email
        }
      });
      
      // Notification to reporting manager
      if (user.reportingManager) {
        await prisma.notification.create({
          data: {
            userId: user.reportingManager.id,
            title: 'Team Member Escalation',
            message: `Escalation created for ${user.fullName}: ${escalation.description}`,
            type: 'ESCALATION',
            emailTo: user.reportingManager.email
          }
        });
      }
      
      // Notifications to all HR users
      const hrUsers = await prisma.user.findMany({
        where: { role: 'HR' },
        select: { id: true, email: true }
      });
      
      for (const hrUser of hrUsers) {
        await prisma.notification.create({
          data: {
            userId: hrUser.id,
            title: 'New Escalation',
            message: `Escalation created for ${user.fullName}: ${escalation.description}`,
            type: 'ESCALATION',
            emailTo: hrUser.email
          }
        });
      }
      
      // Mark email as sent
      await prisma.escalation.update({
        where: { id: escalation.id },
        data: { emailSent: true }
      });
      
    } catch (error) {
      console.error('Error sending escalation notifications:', error);
    }
  }

  /**
   * Get escalations for managers (only their team members)
   */
  static async getManagerEscalations(managerId) {
    try {
      const escalations = await prisma.escalation.findMany({
        where: {
          user: {
            reportingManagerId: managerId
          },
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        },
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
      
      return escalations;
    } catch (error) {
      console.error('Error getting manager escalations:', error);
      throw new Error('Failed to get manager escalations');
    }
  }

  /**
   * Get all escalations for HR and MD
   */
  static async getAllEscalations() {
    try {
      const escalations = await prisma.escalation.findMany({
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
                  fullName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return escalations;
    } catch (error) {
      console.error('Error getting all escalations:', error);
      throw new Error('Failed to get all escalations');
    }
  }

  /**
   * Update escalation status
   */
  static async updateEscalationStatus(escalationId, status, resolvedBy, notes) {
    try {
      const updateData = {
        status,
        notes
      };
      
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = resolvedBy;
      }
      
      const escalation = await prisma.escalation.update({
        where: { id: escalationId },
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
      
      // Notify employee about resolution
      if (status === 'RESOLVED') {
        await prisma.notification.create({
          data: {
            userId: escalation.userId,
            title: 'Escalation Resolved',
            message: `Your escalation regarding ${escalation.type.toLowerCase()} has been resolved.`,
            type: 'ESCALATION'
          }
        });
      }
      
      return escalation;
    } catch (error) {
      console.error('Error updating escalation:', error);
      throw new Error('Failed to update escalation');
    }
  }

  /**
   * Get escalation statistics
   */
  static async getEscalationStats(timePeriod = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timePeriod);
      
      const escalations = await prisma.escalation.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      });
      
      const stats = {
        total: escalations.length,
        open: escalations.filter(e => e.status === 'OPEN').length,
        inProgress: escalations.filter(e => e.status === 'IN_PROGRESS').length,
        resolved: escalations.filter(e => e.status === 'RESOLVED').length,
        byType: {
          absence: escalations.filter(e => e.type === 'ABSENCE').length,
          lateness: escalations.filter(e => e.type === 'LATENESS').length,
          performance: escalations.filter(e => e.type === 'PERFORMANCE').length
        },
        bySeverity: {
          low: escalations.filter(e => e.severity === 'LOW').length,
          medium: escalations.filter(e => e.severity === 'MEDIUM').length,
          high: escalations.filter(e => e.severity === 'HIGH').length,
          critical: escalations.filter(e => e.severity === 'CRITICAL').length
        }
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting escalation stats:', error);
      throw new Error('Failed to get escalation statistics');
    }
  }
}

module.exports = EscalationService;
