const express = require('express');
const router = express.Router();
const { getPaymentSettings, updatePaymentSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

router.route('/payment')
  .get(protect, getPaymentSettings)
  .put(protect, authorize('admin'), updatePaymentSettings);

module.exports = router;
