const express = require('express');
const router = express.Router();
const {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getMenuItems)
  .post(protect, authorize('admin', 'canteen'), createMenuItem);  // canteen can add items

router.route('/:id')
  .get(getMenuItemById)
  .put(protect, authorize('admin', 'canteen'), updateMenuItem)    // canteen can edit availability
  .delete(protect, authorize('admin'), deleteMenuItem);           // only admin can delete

module.exports = router;
