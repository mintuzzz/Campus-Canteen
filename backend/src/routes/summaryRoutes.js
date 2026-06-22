const express = require('express');
const router = express.Router();
const { getDailySummary, getHistoricalSummaries } = require('../controllers/summaryController');
const { protect, authorize } = require('../middleware/auth');

router.get('/today', protect, authorize('admin'), getDailySummary);
router.get('/', protect, authorize('admin'), getHistoricalSummaries);

module.exports = router;
