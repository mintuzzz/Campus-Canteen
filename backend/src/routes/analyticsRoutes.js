const express = require('express');
const router = express.Router();
const { getAnalyticsDashboard } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('admin'), getAnalyticsDashboard);

module.exports = router;
