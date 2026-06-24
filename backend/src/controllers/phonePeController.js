const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

// ── Initialize Razorpay (lazy — only if keys are set) ────────────────────
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// Helper to emit socket events
const emitSocketEvent = (req, room, eventName, data) => {
  const io = req.app?.get('socketio');
  if (io) io.to(room).emit(eventName, data);
};

// @desc  Initiate a Razorpay payment order for a pending canteen order
// @route POST /api/payment/initiate
// @access Private
exports.initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (order.paymentStatus === 'Paid') {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    // Amount in paise (rupees × 100), with 5% GST
    const amountInPaise = Math.round(order.totalAmount * 1.05 * 100);

    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(503).json({ message: 'Online payment is not configured. Please use Cash on Pickup.' });
    }

    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `CC-${order._id.toString().slice(-10)}`,
      notes: {
        canteenOrderId: order._id.toString(),
        orderReference: order.orderReference || '',
      },
    });

    // Store Razorpay order ID on our order
    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    return res.status(200).json({
      rzpOrderId: rzpOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order._id,
      orderReference: order.orderReference,
      userName: req.user.name,
      userEmail: req.user.email,
      userPhone: req.user.phone || '',
    });
  } catch (err) {
    console.error('initiatePayment error:', err);
    return res.status(500).json({ message: 'Failed to initiate payment', error: err.message });
  }
};

// @desc  Verify Razorpay payment signature and mark order paid
// @route POST /api/payment/verify
// @access Private
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    // Verify HMAC-SHA256 signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.paymentStatus = 'Paid';
    order.status = 'Accepted';
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    const populatedOrder = await Order.findById(order._id).populate('userId', 'name email phone studentId department');
    emitSocketEvent(req, 'admin', 'newOrder', populatedOrder);
    emitSocketEvent(req, 'canteen', 'newOrder', populatedOrder);
    emitSocketEvent(req, order.userId.toString(), 'orderUpdated', populatedOrder);

    await Notification.create({
      userId: order.userId,
      title: 'Payment Successful 🎉',
      message: `Payment confirmed for order ${order.orderReference || order._id}. Your food is being prepared!`,
    });

    return res.status(200).json({ success: true, orderId: order._id });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ message: 'Payment verification failed', error: err.message });
  }
};

// @desc  Get payment status (polling fallback)
// @route GET /api/payment/status/:orderId
// @access Private
exports.getPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select('paymentStatus status orderReference totalAmount');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.status(200).json({
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      status: order.status,
      orderReference: order.orderReference,
      totalAmount: order.totalAmount,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching status' });
  }
};

// Stub for old callback route — not used with Razorpay
exports.paymentCallback = (req, res) => res.status(200).json({ message: 'OK' });
