const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAdminOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// Note: Specific routes must go before dynamic parameters like :id
router.route('/myorders')
  .get(protect, getMyOrders);

router.route('/')
  .post(protect, createOrder)
  .get(protect, authorize('admin'), getAdminOrders);

router.route('/:id')
  .get(protect, getOrderById);

router.route('/:id/status')
  .put(protect, authorize('admin'), updateOrderStatus);

module.exports = router;
