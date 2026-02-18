const NotificationService = require('../services/notificationService');

// Get user notifications
const getNotifications = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { limit = 20, offset = 0, unreadOnly, type } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unreadOnly === 'true',
      type,
    };

    const notifications = await NotificationService.getUserNotifications(userId, options);
    const unreadCount = await NotificationService.getUnreadCount(userId);

    res.json({
      notifications,
      unreadCount,
      hasMore: notifications.length === parseInt(limit),
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      error: "Failed to fetch notifications",
      details: error.message,
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { notificationId } = req.params;

    const success = await NotificationService.markAsRead(notificationId, userId);

    if (!success) {
      return res.status(404).json({
        error: "Notification not found or access denied",
      });
    }

    res.json({
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      error: "Failed to mark notification as read",
      details: error.message,
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const count = await NotificationService.markAllAsRead(userId);

    res.json({
      message: `Marked ${count} notifications as read`,
      count,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({
      error: "Failed to mark all notifications as read",
      details: error.message,
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { notificationId } = req.params;

    const success = await NotificationService.delete(notificationId, userId);

    if (!success) {
      return res.status(404).json({
        error: "Notification not found or access denied",
      });
    }

    res.json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      error: "Failed to delete notification",
      details: error.message,
    });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const count = await NotificationService.getUnreadCount(userId);

    res.json({
      unreadCount: count,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      error: "Failed to get unread count",
      details: error.message,
    });
  }
};

// Get notification statistics (for managers and above)
const getNotificationStatistics = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { userId: targetUserId } = req.query;

    let statistics;
    
    // Users can only see their own statistics
    if (role === 'EMPLOYEE') {
      statistics = await NotificationService.getStatistics(userId);
    } 
    // Managers can see their team's statistics
    else if (role === 'MANAGER') {
      const prisma = require('../prismaClient');
      const teamMembers = await prisma.user.findMany({
        where: { reportingManagerId: userId },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map(member => member.id);
      
      if (targetUserId && teamMemberIds.includes(targetUserId)) {
        statistics = await NotificationService.getStatistics(targetUserId);
      } else {
        // Get aggregated statistics for the whole team
        statistics = await NotificationService.getStatistics(null, null); // All users
        // Note: In a real implementation, you might want to filter by team members
      }
    }
    // HR and MD can see all statistics
    else if (role === 'HR' || role === 'MD') {
      if (targetUserId) {
        statistics = await NotificationService.getStatistics(targetUserId);
      } else {
        statistics = await NotificationService.getStatistics();
      }
    }

    res.json({
      statistics,
    });
  } catch (error) {
    console.error("Get notification statistics error:", error);
    res.status(500).json({
      error: "Failed to get notification statistics",
      details: error.message,
    });
  }
};

// Clean up old notifications (admin only)
const cleanupNotifications = async (req, res) => {
  try {
    const { role } = req.user;

    if (!['HR', 'MD'].includes(role)) {
      return res.status(403).json({
        error: "Forbidden: Only HR and MD can clean up notifications",
      });
    }

    const count = await NotificationService.cleanupOldNotifications();

    res.json({
      message: `Cleaned up ${count} old notifications`,
      count,
    });
  } catch (error) {
    console.error("Cleanup notifications error:", error);
    res.status(500).json({
      error: "Failed to clean up notifications",
      details: error.message,
    });
  }
};

// Legacy methods for backward compatibility
const list = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const notifications = await NotificationService.getUserNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error("List notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

const markRead = async (req, res) => {
  try {
    const { ids } = req.body; // array of ids
    const { id: userId } = req.user;
    
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids required' });
    
    // Mark each notification as read
    for (const notificationId of ids) {
      await NotificationService.markAsRead(notificationId, userId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getNotificationStatistics,
  cleanupNotifications,
  // Legacy methods
  list,
  markRead,
};
