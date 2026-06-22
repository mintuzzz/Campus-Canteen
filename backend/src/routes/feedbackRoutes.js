const express = require('express');
const router = express.Router();
const {
  submitFeedback,
  editFeedback,
  getFeedbackByOrderId,
  getAllFeedback,
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, submitFeedback)
  .get(protect, authorize('admin'), getAllFeedback);

router.route('/:id')
  .put(protect, editFeedback);

router.route('/order/:orderId')
  .get(protect, getFeedbackByOrderId);

module.exports = router;
