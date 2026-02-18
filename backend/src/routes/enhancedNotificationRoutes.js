const express = require('express');
const router = express.Router();
const { authenticate, roleGuard } = require('../middleware/auth');
const {
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
} = require('../controllers/notificationController');

// All routes require authentication
router.use(authenticate);

// Enhanced notification endpoints
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllAsRead);

// Individual notification operations
router.put('/:notificationId/read', markAsRead);
router.delete('/:notificationId', deleteNotification);

// Statistics (role-based access)
router.get('/statistics', getNotificationStatistics);

// Cleanup (HR and MD only)
router.delete('/cleanup', roleGuard('HR', 'MD'), cleanupNotifications);

// Legacy endpoints for backward compatibility
router.get('/legacy', list);
router.put('/legacy/mark-read', markRead);

module.exports = router;
