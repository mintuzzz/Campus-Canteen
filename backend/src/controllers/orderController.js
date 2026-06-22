const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const FoodItem = require('../models/FoodItem');

// Helper to emit events to specific rooms
const emitSocketEvent = (req, room, eventName, data) => {
  const io = req.app.get('socketio');
  if (io) {
    io.to(room).emit(eventName, data);
  }
};

// Helper to create notifications
const createNotification = async (req, userId, title, message) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
    });
    emitSocketEvent(req, userId.toString(), 'newNotification', notification);
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { items, paymentMethod, paymentDetails } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    // Verify items and prices from DB to avoid client-side spoofing
    let calculatedTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const dbItem = await FoodItem.findById(item.foodId);
      if (!dbItem) {
        return res.status(404).json({ message: `Food item ${item.foodId} not found` });
      }
      if (!dbItem.availability) {
        return res.status(400).json({ message: `Food item '${dbItem.name}' is currently unavailable` });
      }
      calculatedTotal += dbItem.price * item.quantity;
      verifiedItems.push({
        foodId: dbItem._id,
        name: dbItem.name,
        image: dbItem.image,
        quantity: item.quantity,
        price: dbItem.price,
      });
    }

    // Generate Token Number (e.g., CNT-7489)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const tokenNumber = `CNT-${randomNum}`;

    // Set Estimated Pickup Time (e.g., 20 mins from now)
    const pickupDate = new Date();
    pickupDate.setMinutes(pickupDate.getMinutes() + 20);
    const pickupTime = pickupDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Initial payment status
    let paymentStatus = 'Pending';
    if (paymentMethod !== 'Cash On Pickup') {
      paymentStatus = 'Paid'; // Mock immediate payment success for online types
    }

    const order = new Order({
      userId: req.user._id,
      items: verifiedItems,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentStatus,
      status: 'Pending',
      tokenNumber,
      pickupTime,
    });

    const savedOrder = await order.save();

    // Create payment transaction log
    const transactionId = paymentMethod === 'Cash On Pickup' 
      ? 'COP-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      : (paymentDetails?.transactionId || 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase());

    const payment = await Payment.create({
      orderId: savedOrder._id,
      amount: calculatedTotal,
      paymentMethod,
      paymentStatus,
      transactionId,
    });

    // Send notifications
    await createNotification(
      req,
      req.user._id,
      'Order Placed Successfully',
      `Your order (Token: ${tokenNumber}) has been submitted. Estimated pickup: ${pickupTime}`
    );

    // Notify admins
    const populatedOrder = await Order.findById(savedOrder._id).populate('userId', 'name email phone studentId department');
    emitSocketEvent(req, 'admin', 'newOrder', populatedOrder);

    res.status(201).json({
      order: populatedOrder,
      payment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error placing order', error: error.message });
  }
};

// @desc    Get student's own orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching your orders' });
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone studentId department');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization check: User must be either the owner or an admin
    if (req.user.role !== 'admin' && order.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching order details' });
  }
};

// @desc    Get all orders (Admin overview)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAdminOrders = async (req, res) => {
  try {
    const { status, paymentStatus } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== 'All') {
      query.paymentStatus = paymentStatus;
    }

    const orders = await Order.find(query)
      .populate('userId', 'name email phone studentId department')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching admin orders' });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, pickupTime } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    if (pickupTime) {
      order.pickupTime = pickupTime;
    }

    // Auto-complete payment for Cash On Pickup orders when completed
    if (status === 'Completed' && order.paymentStatus === 'Pending') {
      order.paymentStatus = 'Paid';
      // Sync corresponding Payment model
      await Payment.findOneAndUpdate(
        { orderId: order._id },
        { paymentStatus: 'Paid' }
      );
    }

    // Handle refund status if order is cancelled and was pre-paid
    if (status === 'Cancelled' && order.paymentStatus === 'Paid') {
      order.paymentStatus = 'Refunded';
      await Payment.findOneAndUpdate(
        { orderId: order._id },
        { paymentStatus: 'Refunded' }
      );
    }

    const updatedOrder = await order.save();

    // Notify user of status update
    let message = `Your order status has been updated to: ${status}`;
    if (status === 'Accepted') {
      message = `Your order has been accepted. Estimated pickup: ${order.pickupTime}`;
    } else if (status === 'Preparing') {
      message = `Canteen is now preparing your food.`;
    } else if (status === 'Ready') {
      message = `Your food is ready! Please collect from the counter. (Token: ${order.tokenNumber})`;
    } else if (status === 'Completed') {
      message = `Your order is complete. Hope you enjoyed it! Click to review.`;
    } else if (status === 'Cancelled') {
      message = `Your order has been cancelled by the Canteen Admin.`;
    }

    await createNotification(
      req,
      order.userId,
      `Order Status Update: ${status}`,
      message
    );

    // Emit live event to student socket room and update admin board
    const populatedOrder = await Order.findById(updatedOrder._id).populate('userId', 'name email phone studentId department');
    emitSocketEvent(req, order.userId.toString(), 'orderStatusChanged', populatedOrder);
    emitSocketEvent(req, 'admin', 'orderStatusChanged', populatedOrder);

    res.json(populatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating order status', error: error.message });
  }
};
