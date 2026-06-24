const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAdminOrders,
  updateOrderStatus,
  verifyPayment,
  verifyPickupToken,
  markNoShow,
  uploadScreenshotMiddleware,
  uploadPaymentScreenshot,
  getPendingPayments,
  approvePayment,
  rejectPayment,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// Specific routes before dynamic :id
router.route('/myorders')
  .get(protect, getMyOrders);

router.route('/verify-payment')
  .post(protect, verifyPayment);

// Token-based manual pickup verification (replaces QR scan)
router.route('/verify-token')
  .post(protect, authorize('admin', 'canteen'), verifyPickupToken);

router.route('/verify-pickup')
  .post(protect, authorize('admin', 'canteen'), verifyPickupToken);

router.route('/pending-payments')
  .get(protect, authorize('admin', 'canteen'), getPendingPayments);

router.route('/:id/upload-screenshot')
  .post(protect, uploadScreenshotMiddleware, uploadPaymentScreenshot);

router.route('/:id/approve-payment')
  .post(protect, authorize('admin', 'canteen'), approvePayment);

router.route('/:id/reject-payment')
  .post(protect, authorize('admin', 'canteen'), rejectPayment);

router.route('/')
  .post(protect, authorize('student'), createOrder)
  .get(protect, authorize('admin', 'canteen'), getAdminOrders);

router.route('/:id')
  .get(protect, getOrderById);

router.route('/:id/status')
  .put(protect, authorize('admin', 'canteen'), updateOrderStatus);

router.route('/:id/no-show')
  .post(protect, authorize('admin', 'canteen'), markNoShow);

module.exports = router;
