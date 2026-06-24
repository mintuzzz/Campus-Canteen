const express = require('express');
const router = express.Router();
const { getAnalyticsDashboard, getAuditLogs } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('admin'), getAnalyticsDashboard);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);

module.exports = router;
