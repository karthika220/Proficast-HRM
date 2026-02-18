const prisma = require('../prismaClient');

class NotificationService {
  // Create notification with email support
  static async create(userId, title, message, type, emailTo = null) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          emailTo
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

      console.log(`Notification created: ${title} for user ${userId}`);
      
      // Send email if email service is configured
      if (emailTo || notification.user?.email) {
        await this.sendEmailNotification(notification, emailTo || notification.user?.email);
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for user
  static async getUserNotifications(userId, options = {}) {
    const { limit = 20, offset = 0, unreadOnly = false, type } = options;

    let whereClause = { userId };
    
    if (unreadOnly) {
      whereClause.isRead = false;
    }
    
    if (type) {
      whereClause.type = type;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    return notifications;
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId, // Ensure user can only mark their own notifications
        },
        data: {
          isRead: true,
        },
      });

      return notification.count > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for user
  static async markAllAsRead(userId) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread count for user
  static async getUnreadCount(userId) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Delete notification
  static async delete(notificationId, userId) {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId, // Ensure user can only delete their own notifications
        },
      });

      return result.count > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Notify multiple users
  static async notifyMultipleUsers(userIds, title, message, type) {
    try {
      const notifications = await Promise.all(
        userIds.map(userId =>
          this.create(userId, title, message, type).catch(error => {
            console.error(`Failed to create notification for user ${userId}:`, error);
            return null;
          })
        )
      );

      const successfulNotifications = notifications.filter(n => n !== null);
      console.log(`Created ${successfulNotifications.length} notifications for ${userIds.length} users`);
      
      return successfulNotifications;
    } catch (error) {
      console.error('Error notifying multiple users:', error);
      throw error;
    }
  }

  // Notify by role
  static async notifyByRole(role, title, message, type) {
    try {
      const users = await prisma.user.findMany({
        where: { role },
        select: { id: true },
      });

      const userIds = users.map(user => user.id);
      return await this.notifyMultipleUsers(userIds, title, message, type);
    } catch (error) {
      console.error('Error notifying by role:', error);
      throw error;
    }
  }

  // Notify reporting manager
  static async notifyReportingManager(employeeId, title, message, type) {
    try {
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: { reportingManagerId: true },
      });

      if (employee?.reportingManagerId) {
        await this.create(employee.reportingManagerId, title, message, type);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error notifying reporting manager:', error);
      throw error;
    }
  }

  // Notify HR team
  static async notifyHR(title, message, type, excludeUserId = null) {
    try {
      let whereClause = { role: 'HR' };
      
      if (excludeUserId) {
        whereClause.id = { not: excludeUserId };
      }

      const hrUsers = await prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      const userIds = hrUsers.map(user => user.id);
      return await this.notifyMultipleUsers(userIds, title, message, type);
    } catch (error) {
      console.error('Error notifying HR:', error);
      throw error;
    }
  }

  // Notify team members
  static async notifyTeam(managerId, title, message, type, excludeUserId = null) {
    try {
      let whereClause = { reportingManagerId: managerId };
      
      if (excludeUserId) {
        whereClause.id = { not: excludeUserId };
      }

      const teamMembers = await prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      const userIds = teamMembers.map(member => member.id);
      return await this.notifyMultipleUsers(userIds, title, message, type);
    } catch (error) {
      console.error('Error notifying team:', error);
      throw error;
    }
  }

  // Clean up old notifications (older than 30 days)
  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          isRead: true, // Only delete read notifications
        },
      });

      console.log(`Cleaned up ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  // Get notification statistics
  static async getStatistics(userId = null, role = null) {
    try {
      let whereClause = {};
      
      if (userId) {
        whereClause.userId = userId;
      } else if (role) {
        const users = await prisma.user.findMany({
          where: { role },
          select: { id: true },
        });
        whereClause.userId = { in: users.map(u => u.id) };
      }

      const [total, unread, byType] = await Promise.all([
        prisma.notification.count({ where: whereClause }),
        prisma.notification.count({ 
          where: { ...whereClause, isRead: false } 
        }),
        prisma.notification.groupBy({
          by: ['type'],
          where: whereClause,
          _count: { type: true },
        }),
      ]);

      const typeStats = byType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {});

      return {
        total,
        unread,
        read: total - unread,
        byType: typeStats,
      };
    } catch (error) {
      console.error('Error getting notification statistics:', error);
      throw error;
    }
  }

  // Automated daily attendance reminder
  static async sendDailyAttendanceReminder() {
    try {
      const currentHour = new Date().getHours();
      
      // Send reminder at 9:10 AM for those who haven't checked in
      if (currentHour === 9 && new Date().getMinutes() >= 10) {
        const today = new Date().toISOString().split('T')[0];
        
        // Find users who haven't checked in today
        const absentUsers = await prisma.user.findMany({
          where: {
            NOT: {
              attendance: {
                some: {
                  date: new Date(today),
                  checkIn: {
                    not: null
                  }
                }
              }
            },
            status: 'Active',
            role: {
              not: 'MD' // Skip MD for automated reminders
            }
          },
          select: {
            id: true,
            fullName: true,
            email: true
          }
        });
        
        for (const user of absentUsers) {
          await this.create(
            user.id,
            'Check-in Reminder',
            'You have not checked in yet today. Please check in to mark your attendance.',
            'MISSING_CHECKIN',
            user.email
          );
        }
      }
      
      return { sent: true };
    } catch (error) {
      console.error('Error sending daily attendance reminder:', error);
      return { sent: false, error: error.message };
    }
  }

  // Automated break reminders
  static async sendBreakReminders() {
    try {
      const currentHour = new Date().getHours();
      
      // Check for users on lunch break for more than 1 hour
      if (currentHour >= 14 && currentHour <= 15) { // 2 PM to 3 PM
        const today = new Date().toISOString().split('T')[0];
        
        const longBreakUsers = await prisma.attendance.findMany({
          where: {
            date: new Date(today),
            breakStart: {
              not: null
            },
            breakEnd: null,
            breakReminderSent: false
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        });
        
        for (const attendance of longBreakUsers) {
          const breakDuration = (new Date() - attendance.breakStart) / (1000 * 60);
          
          if (breakDuration > 60) { // More than 1 hour
            await this.create(
              attendance.user.id,
              'Break Reminder',
              'Your lunch break is over. Please check back in to resume work.',
              'BREAK_REMINDER',
              attendance.user.email
            );
            
            // Mark reminder as sent
            await prisma.attendance.update({
              where: { id: attendance.id },
              data: { breakReminderSent: true }
            });
          }
        }
      }
      
      return { sent: true };
    } catch (error) {
      console.error('Error sending break reminders:', error);
      return { sent: false, error: error.message };
    }
  }

  // Send email notification (placeholder for actual email service)
  static async sendEmailNotification(notification, emailAddress) {
    try {
      // This is a placeholder for actual email service integration
      // You can integrate with services like SendGrid, Nodemailer, etc.
      
      console.log('Email notification sent:', {
        to: emailAddress,
        subject: notification.title,
        message: notification.message,
        type: notification.type
      });
      
      // Mark email as sent in database
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSent: true }
      });
      
      return { sent: true };
    } catch (error) {
      console.error('Error sending email notification:', error);
      return { sent: false, error: error.message };
    }
  }

  // Create escalation email notification
  static async createEscalationEmail(userId, title, message, escalationId, recipientEmail) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: 'ESCALATION_EMAIL',
          emailTo: recipientEmail,
          emailSent: false // Will be sent separately
        }
      });
      
      // Send escalation email immediately
      await this.sendEmailNotification(notification, recipientEmail);
      
      return notification;
    } catch (error) {
      console.error('Error creating escalation email:', error);
      throw new Error('Failed to create escalation email');
    }
  }
}

module.exports = NotificationService;
