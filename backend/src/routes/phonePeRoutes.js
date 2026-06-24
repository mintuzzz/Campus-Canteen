const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  initiatePayment,
  verifyPayment,
  getPaymentStatus,
  paymentCallback,
} = require('../controllers/phonePeController');

// Create Razorpay order → returns key + rzpOrderId to frontend
router.post('/initiate', protect, initiatePayment);

// Frontend sends back payment ID + signature after user pays → backend verifies
router.post('/verify', protect, verifyPayment);

// Poll order payment status
router.get('/status/:orderId', protect, getPaymentStatus);

// Legacy callback stub (not used with Razorpay)
router.post('/callback', paymentCallback);

module.exports = router;
