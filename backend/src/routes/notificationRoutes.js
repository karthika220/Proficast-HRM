const express = require('express');
const router = express.Router();
const { list, markRead } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, list);
router.post('/read', authenticate, markRead);

module.exports = router;
