const express = require('express');
const router = express.Router();
const { monthly, late } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.get('/monthly', authenticate, monthly);
router.get('/late', authenticate, late);

module.exports = router;
