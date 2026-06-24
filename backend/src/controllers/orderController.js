const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const FoodItem = require('../models/FoodItem');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Razorpay = require('razorpay');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Initialize Razorpay
const rzpKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId12345';
const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || 'mockSecret123456789';
const razorpay = new Razorpay({
  key_id: rzpKeyId,
  key_secret: rzpKeySecret,
});

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

// @desc    Create new order & initialize Razorpay payment
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { items, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    // 1. Account Reputation / Penalty Check
    const currentUser = await User.findById(req.user._id);
    if (currentUser.penaltyStatus === 'Suspended' && currentUser.suspensionUntil > new Date()) {
      return res.status(403).json({
        message: `Your ordering privileges have been suspended until ${currentUser.suspensionUntil.toLocaleString()}.`,
        suspensionUntil: currentUser.suspensionUntil,
      });
    }

    // 2. Item Quantity limits & DB verification
    let calculatedTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      if (item.quantity > 5) {
        return res.status(400).json({ message: `Maximum quantity per item is 5 units. '${item.name || 'Item'}' exceeds this.` });
      }

      const dbItem = await FoodItem.findById(item.foodId);
      if (!dbItem) {
        return res.status(404).json({ message: `Food item not found` });
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

    // 4. Duplicate Order Detection (Identical orders within 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentOrders = await Order.find({
      userId: req.user._id,
      createdAt: { $gte: twoMinutesAgo },
      status: { $ne: 'Cancelled' },
    });

    const isDuplicate = recentOrders.some((recent) => {
      if (recent.items.length !== items.length) return false;
      return items.every((itm) =>
        recent.items.some((ri) => ri.foodId.toString() === itm.foodId.toString() && ri.quantity === itm.quantity)
      );
    });

    if (isDuplicate) {
      return res.status(400).json({ message: 'Duplicate identical order detected. Please wait 2 minutes before retrying.' });
    }

    // Create unique initial Token Number (e.g., CNT-1234)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const tokenNumber = `CNT-${randomNum}`;

    // Set Estimated Pickup Time
    const pickupDate = new Date();
    pickupDate.setMinutes(pickupDate.getMinutes() + 20);
    const pickupTime = pickupDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // ─── PHONEPE / UPI PAYMENT: create order in DB, frontend then calls /api/payment/initiate ─
    if (paymentMethod === 'UPI') {
      const order = new Order({
        userId: req.user._id,
        items: verifiedItems,
        totalAmount: calculatedTotal,
        paymentMethod,
        paymentStatus: 'Pending Payment',
        status: 'Pending Payment',
        tokenNumber,
        pickupTime,
        razorpayOrderId: '',
      });

      const savedOrder = await order.save();

      // Amount with 5% GST displayed for reference
      const finalAmount = Number((calculatedTotal * 1.05).toFixed(2));

      return res.status(201).json({
        order: savedOrder,
        finalAmount,
        message: 'Order created. Proceed to PhonePe payment.',
      });
    }

    // ─── CASH ON PICKUP: bypass Razorpay entirely ───────────────────────────
    if (paymentMethod === 'Cash On Pickup') {
      // Generate unique pickup token immediately for cash orders
      let cashPickupToken = '';
      let cashTokenUnique = false;
      while (!cashTokenUnique) {
        const randDigits = Math.floor(100000 + Math.random() * 900000);
        cashPickupToken = `CC-${new Date().getFullYear()}-${randDigits}`;
        const existing = await Order.findOne({ pickupToken: cashPickupToken });
        if (!existing) cashTokenUnique = true;
      }

      const order = new Order({
        userId: req.user._id,
        items: verifiedItems,
        totalAmount: calculatedTotal,
        paymentMethod,
        paymentStatus: 'Pending',
        status: 'Pending',
        tokenNumber,
        token: cashPickupToken,
        pickupToken: cashPickupToken,
        tokenVerified: false,
        pickupTime,
        razorpayOrderId: '',
      });
      const savedOrder = await order.save();

      // Notify admins about new cash order
      const populatedOrder = await Order.findById(savedOrder._id).populate('userId', 'name email phone studentId department');
      emitSocketEvent(req, 'admin', 'newOrder', populatedOrder);
      emitSocketEvent(req, 'canteen', 'newOrder', populatedOrder);

      await createNotification(
        req,
        req.user._id,
        'Cash Order Placed',
        `Your cash order is confirmed. Your pickup token is: ${cashPickupToken}. Please have ₹${(calculatedTotal * 1.05).toFixed(2)} ready at pickup.`
      );

      return res.status(201).json({ order: savedOrder });
    }
    // ────────────────────────────────────────────────────────────────────────

    // Initialize Razorpay Order
    let razorpayOrder;
    const isMockKey = rzpKeyId.startsWith('rzp_test_mock');

    if (isMockKey) {
      // Mock mode
      razorpayOrder = {
        id: 'order_mock_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        amount: Math.round(calculatedTotal * 1.05 * 100), // GST included
        currency: 'INR',
      };
    } else {
      try {
        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(calculatedTotal * 1.05 * 100),
          currency: 'INR',
          receipt: `receipt_order_${Date.now()}`,
        });
      } catch (err) {
        console.warn('Razorpay SDK order creation failed, falling back to mock order:', err.message);
        razorpayOrder = {
          id: 'order_mock_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
          amount: Math.round(calculatedTotal * 1.05 * 100),
          currency: 'INR',
        };
      }
    }

    const order = new Order({
      userId: req.user._id,
      items: verifiedItems,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentStatus: 'Pending Payment',
      status: 'Pending Payment',
      tokenNumber,
      token: '', // set after payment verification
      pickupTime,
      razorpayOrderId: razorpayOrder.id,
    });

    const savedOrder = await order.save();

    res.status(201).json({
      order: savedOrder,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: rzpKeyId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error placing order', error: error.message });
  }
};

// @desc    Verify Razorpay Payment signature and finalize order
// @route   POST /api/orders/verify-payment
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order record not found' });
    }

    // Verify signature
    let isValid = false;
    const isMock = razorpay_order_id.startsWith('order_mock_');

    if (isMock) {
      isValid = true;
    } else {
      const generated_signature = crypto
        .createHmac('sha256', rzpKeySecret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');
      isValid = generated_signature === razorpay_signature;
    }

    if (!isValid) {
      order.status = 'Cancelled';
      order.paymentStatus = 'Failed';
      await order.save();

      // Log failed transaction
      await Payment.create({
        orderId: order._id,
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: 'Failed',
        transactionId: razorpay_payment_id || 'FAILED_TXN',
      });

      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    // Generate unique pickup token CC-YYYY-XXXXXX
    let pickupToken = '';
    let isUnique = false;
    while (!isUnique) {
      const randDigits = Math.floor(100000 + Math.random() * 900000);
      pickupToken = `CC-${new Date().getFullYear()}-${randDigits}`;
      const existing = await Order.findOne({ pickupToken });
      if (!existing) isUnique = true;
    }

    // Update order — no QR code generated (token-based pickup now)
    order.status = 'Paid';
    order.paymentStatus = 'Paid';
    order.token = pickupToken;
    order.tokenNumber = pickupToken;
    order.pickupToken = pickupToken;
    order.tokenVerified = false;
    order.razorpayPaymentId = razorpay_payment_id;
    order.pickupTime = 'Preparing';

    const updatedOrder = await order.save();

    // Create payment record
    await Payment.create({
      orderId: order._id,
      amount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: 'Paid',
      transactionId: razorpay_payment_id,
    });

    // Notify student
    await createNotification(
      req,
      req.user._id,
      'Payment Successful',
      `Payment confirmed! Your pickup token is: ${pickupToken}. Show this token at the counter to collect your food.`
    );

    // Notify staff
    const populatedOrder = await Order.findById(updatedOrder._id).populate('userId', 'name email phone studentId department');
    emitSocketEvent(req, 'admin', 'newOrder', populatedOrder);
    emitSocketEvent(req, 'canteen', 'newOrder', populatedOrder);

    res.json({ success: true, order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error verifying payment', error: error.message });
  }
};

// @desc    Manual token verification to complete order pickup
// @route   POST /api/orders/verify-token
// @access  Private/Admin+Canteen
exports.verifyPickupToken = async (req, res) => {
  try {
    let tokenVal = req.body.pickupToken || req.body.qrData;

    if (!tokenVal || !tokenVal.trim()) {
      return res.status(400).json({ message: 'Pickup token or QR code payload is required.' });
    }

    tokenVal = tokenVal.trim();

    // If it's a JSON string from QR code scanner, parse it
    if (tokenVal.startsWith('{') && tokenVal.endsWith('}')) {
      try {
        const parsed = JSON.parse(tokenVal);
        if (parsed.token) {
          tokenVal = parsed.token;
        } else if (parsed.orderId) {
          tokenVal = parsed.orderId;
        }
      } catch (err) {
        // Ignore and treat as plain text token
      }
    }

    const query = {
      $or: [
        { pickupToken: tokenVal },
        { token: tokenVal }
      ]
    };

    // If it is a valid MongoDB ObjectId format, allow searching by _id
    if (/^[0-9a-fA-F]{24}$/.test(tokenVal)) {
      query.$or.push({ _id: tokenVal });
    }

    // Find order by pickupToken, token, or _id
    const order = await Order.findOne(query).populate('userId', 'name email phone studentId department');

    if (!order) {
      return res.status(404).json({ message: 'No order found with this token. Please check and try again.' });
    }

    // Validation rules
    if (order.tokenVerified || order.status === 'Completed') {
      return res.status(400).json({ message: 'This pickup token has already been used.' });
    }

    if (order.status !== 'Ready') {
      return res.status(400).json({
        message: `Order is not ready for pickup yet. Current status: ${order.status}.`
      });
    }

    const isCashOrder = order.paymentMethod === 'Cash On Pickup';
    if (!isCashOrder && order.paymentStatus !== 'Paid') {
      return res.status(400).json({ message: 'Payment has not been confirmed for this order.' });
    }

    const previousStatus = order.status;

    // Complete the order
    order.status = 'Completed';
    order.tokenVerified = true;
    order.isScanned = true; // backward compat
    order.completedAt = new Date();
    order.completedBy = req.user._id;
    order.pickupTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const savedOrder = await order.save();

    // Audit log
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: 'Token Pickup Verification',
      orderId: order._id,
      previousStatus,
      newStatus: 'Completed',
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
    });

    // Notify student
    await createNotification(
      req,
      order.userId._id || order.userId,
      'Order Completed!',
      `Your order (Token: ${order.token || order.pickupToken || order.tokenNumber}) has been verified and picked up. Enjoy your food!`
    );

    // Emit live events
    const populatedOrder = await Order.findById(savedOrder._id).populate('userId', 'name email phone studentId department');
    emitSocketEvent(req, order.userId._id?.toString() || order.userId.toString(), 'orderStatusChanged', populatedOrder);
    emitSocketEvent(req, 'admin', 'orderStatusChanged', populatedOrder);
    emitSocketEvent(req, 'canteen', 'orderStatusChanged', populatedOrder);

    res.json({
      message: 'Order completed successfully!',
      order: populatedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during token verification', error: error.message });
  }
};

// @desc    Admin marks order as Cancelled due to student not showing up

// @route   POST /api/orders/:id/no-show
// @access  Private/Admin
exports.markNoShow = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'Ready') {
      return res.status(400).json({ message: 'Only orders marked Ready for Pickup can be flagged as No-Show.' });
    }

    const previousStatus = order.status;

    // Cancel order
    order.status = 'Cancelled';
    order.paymentStatus = 'Refunded'; // Mark as refunded on no-show cancel
    await order.save();

    // Update payment record
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      { paymentStatus: 'Refunded' }
    );

    // Increment user warnings & no-shows
    const student = await User.findById(order.userId);
    if (student) {
      student.noShowCount += 1;
      student.warningCount += 1;

      // Penalty check: 3 no-shows -> temporary suspension
      if (student.noShowCount >= 3) {
        student.penaltyStatus = 'Suspended';
        student.suspensionUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days ban
      }
      await student.save();

      // Create warnings notifications
      if (student.penaltyStatus === 'Suspended') {
        await createNotification(
          req,
          student._id,
          'ACCOUNT SUSPENDED',
          `Your ordering privileges have been suspended for 3 days (until ${student.suspensionUntil.toLocaleString()}) due to 3 no-show orders.`
        );
      } else {
        await createNotification(
          req,
          student._id,
          'No-Show Warning',
          `Warning: You did not pick up your food. You now have ${student.noShowCount}/3 no-shows. 3 will suspend your account.`
        );
      }
    }

    // Create Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: 'Flag Student No-Show',
      orderId: order._id,
      previousStatus: previousStatus,
      newStatus: 'Cancelled (No-Show)',
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
    });

    // Notify admins of suspicious activity alert
    emitSocketEvent(req, 'admin', 'suspiciousActivity', {
      message: `No-Show logged: Student ${student?.name || 'Unknown'} missed pickup for order ${order.tokenNumber}. Total No-Shows: ${student?.noShowCount || 1}`,
    });

    // Emit live update
    const populatedOrder = await Order.findById(order._id).populate('userId', 'name email phone studentId department');
    emitSocketEvent(req, order.userId.toString(), 'orderStatusChanged', populatedOrder);
    emitSocketEvent(req, 'admin', 'orderStatusChanged', populatedOrder);

    res.json({ message: 'Order marked as no-show and student warned/suspended.', order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error marking no-show', error: error.message });
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

    // Authorization check: User must be either the owner, an admin, or canteen staff
    if (req.user.role !== 'admin' && req.user.role !== 'canteen' && order.userId._id.toString() !== req.user._id.toString()) {
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

    const previousStatus = order.status;

    // Enforce sequence logic
    // Paid -> Preparing -> Ready
    // Cancelled / Refunded are allowed from states prior to Completed
    if (status === 'Completed') {
      return res.status(400).json({ message: 'Completed status is restricted to token verification only. Use the verify-token endpoint.' });
    }

    if (status === 'Cancelled' || status === 'Refunded') {
      // Allowed transition to cancel
    } else {
      // Check transition sequence
      const validTransitions = {
        'Pending Payment': ['Paid', 'Cancelled'],
        'Pending': ['Accepted', 'Paid', 'Preparing', 'Cancelled'], // Cash on Pickup: Accept -> Accepted -> Preparing
        'Accepted': ['Preparing', 'Cancelled'],
        'Paid': ['Accepted', 'Preparing', 'Cancelled'],
        'Preparing': ['Ready', 'Cancelled'],
        'Ready': ['Cancelled'], // can't manually transition to completed here!
      };

      const allowedNext = validTransitions[previousStatus] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          message: `Forbidden status transition: '${previousStatus}' to '${status}'. Please follow lifecycle: Paid -> Preparing -> Ready.`,
        });
      }
    }

    order.status = status;
    if (pickupTime) {
      order.pickupTime = pickupTime;
    }

    // ── Generate QR for Cash on Pickup when Accepted ─────────────────────
    if (status === 'Accepted' && order.paymentMethod === 'Cash On Pickup' && !order.token) {
      let pickupToken = '';
      let isUnique = false;
      while (!isUnique) {
        const randDigits = Math.floor(100000 + Math.random() * 900000);
        pickupToken = `CC-${new Date().getFullYear()}-${randDigits}`;
        const existing = await Order.findOne({ token: pickupToken });
        if (!existing) isUnique = true;
      }

      const qrData = JSON.stringify({
        orderId: order._id.toString(),
        token: pickupToken,
        studentId: (await require('../models/User').findById(order.userId))?.studentId || 'N/A',
      });
      const qrCodeImage = await QRCode.toDataURL(qrData);

      order.token = pickupToken;
      order.tokenNumber = pickupToken;
      order.qrCode = qrCodeImage;
      order.isScanned = false;
    }
    // ─────────────────────────────────────────────────────────────────────

    // Handle payment status adjustments
    if (status === 'Cancelled' && order.paymentStatus === 'Paid') {
      order.paymentStatus = 'Refunded';
      await Payment.findOneAndUpdate(
        { orderId: order._id },
        { paymentStatus: 'Refunded' }
      );
    }

    const updatedOrder = await order.save();

    // Create Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: 'Status Transition',
      orderId: order._id,
      previousStatus: previousStatus,
      newStatus: status,
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
    });

    // Notify user of status update
    let message = `Your order status has been updated to: ${status}`;
    if (status === 'Accepted') {
      if (order.paymentMethod === 'Cash On Pickup') {
        message = `Your cash order has been accepted! Your QR pickup token (${order.token || order.tokenNumber}) is ready. Please have ₹${(order.totalAmount * 1.05).toFixed(2)} cash ready at the counter.`;
      } else {
        message = `Your payment was confirmed. Order is accepted and food preparation is starting!`;
      }
    } else if (status === 'Paid') {
      message = `Your payment was confirmed. Order is accepted and preparing.`;
    } else if (status === 'Preparing') {
      message = `Canteen is now preparing your food.`;
    } else if (status === 'Ready') {
      message = `Your food is ready! Please show your pickup QR code at the counter. (Token: ${order.token || order.tokenNumber})`;
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

// ─── UPI PAYMENT MULTIPART SCREENSHOT UPLOAD CONFIG ──────────────────────────
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'screenshot-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (jpg, jpeg, png, webp) are allowed!'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('screenshot');

exports.uploadScreenshotMiddleware = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Multer upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// @desc    Upload payment screenshot & run simulated OCR extraction
// @route   POST /api/orders/:id/upload-screenshot
// @access  Private
exports.uploadPaymentScreenshot = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a payment screenshot image.' });
    }

    const { transactionId } = req.body;
    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({ message: 'Transaction ID is required.' });
    }

    const txnIdClean = transactionId.trim();

    // Check for duplicate transactionId
    const duplicateOrder = await Order.findOne({
      transactionId: txnIdClean,
      paymentStatus: { $in: ['Paid', 'Awaiting Verification'] }
    });

    if (duplicateOrder) {
      return res.status(400).json({
        message: 'This Transaction ID has already been submitted. Duplicate payment detected.'
      });
    }

    // Retrieve active UPI configurations
    const Settings = require('../models/Settings');
    let paymentSettings = await Settings.findOne({ key: 'payment' });
    const expectedUpi = paymentSettings?.value?.upiId || 'canteen@okicici';
    const payeeName = paymentSettings?.value?.payeeName || 'College Canteen';

    // Total payable matches checkout: order.totalAmount * 1.05
    const expectedAmount = Number((order.totalAmount * 1.05).toFixed(2));

    // Simulated OCR flow
    const simulateStatus = req.query.simulateStatus || req.body.simulateStatus;
    const isOriginalNameInvalid = req.file.originalname.toLowerCase().includes('fail') || 
                                 req.file.originalname.toLowerCase().includes('invalid') ||
                                 req.file.originalname.toLowerCase().includes('wrong');

    let ocrAmount = expectedAmount;
    let ocrUpi = expectedUpi;
    let ocrName = payeeName;
    let validationStatus = 'LIKELY_VALID';

    if (simulateStatus === 'invalid' || isOriginalNameInvalid) {
      // Simulate failed OCR extraction
      ocrAmount = Number((expectedAmount - 20.00).toFixed(2));
      ocrUpi = 'wrong-canteen@upi';
      validationStatus = 'REVIEW_REQUIRED';
    }

    const ocrResult = {
      extractedAmount: ocrAmount,
      extractedUpiId: ocrUpi,
      extractedPayeeName: ocrName,
      extractedTransactionId: txnIdClean,
      extractedDate: new Date().toLocaleDateString('en-IN'),
      extractedTime: new Date().toLocaleTimeString('en-IN'),
      validationStatus
    };

    // Update Order details
    order.paymentScreenshot = `/uploads/${req.file.filename}`;
    order.transactionId = txnIdClean;
    order.ocrResult = ocrResult;
    order.paymentStatus = 'Awaiting Verification';
    order.status = 'Awaiting Verification';
    await order.save();

    // Create Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: 'Upload UPI Screenshot',
      orderId: order._id,
      previousStatus: 'Pending Payment',
      newStatus: 'Awaiting Verification',
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
    });

    // Notify admins of new pending payment
    emitSocketEvent(req, 'admin', 'pendingPayment', {
      orderId: order._id,
      orderReference: order.orderReference,
      studentName: req.user.name,
      amount: expectedAmount,
      validationStatus
    });

    res.json({
      message: 'Screenshot uploaded and parsed successfully.',
      order,
      ocrResult
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing payment screenshot', error: error.message });
  }
};

// @desc    Get all orders awaiting payment verification
// @route   GET /api/orders/pending-payments
// @access  Private/Admin
exports.getPendingPayments = async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'Awaiting Verification' })
      .populate('userId', 'name email phone studentId department')
      .sort({ updatedAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching pending payments', error: error.message });
  }
};

// @desc    Approve pending payment
// @route   POST /api/orders/:id/approve-payment
// @access  Private/Admin+Canteen
exports.approvePayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (order.paymentStatus !== 'Awaiting Verification') {
      return res.status(400).json({ message: 'Order is not awaiting payment verification.' });
    }

    const previousStatus = order.status;

    order.paymentStatus = 'Paid';
    order.status = 'Accepted';
    order.pickupToken = order.orderReference || `CC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    order.token = order.pickupToken;
    order.tokenNumber = order.pickupToken;
    order.tokenVerified = false;

    // Generate QR code for pickup
    const qrData = JSON.stringify({
      orderId: order._id.toString(),
      token: order.pickupToken,
      studentId: (await User.findById(order.userId))?.studentId || 'N/A',
    });
    order.qrCode = await QRCode.toDataURL(qrData);

    const savedOrder = await order.save();

    // Create Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: 'Approve Payment',
      orderId: order._id,
      previousStatus,
      newStatus: 'Accepted',
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
    });

    // Create payment record
    const Payment = require('../models/Payment');
    await Payment.create({
      orderId: order._id,
      amount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: 'Paid',
      transactionId: order.transactionId,
    });

    // Notify student
    await createNotification(
      req,
      order.userId,
      'Payment Approved!',
      `Your payment for Order ${order.orderReference || order.tokenNumber} was approved. Food preparation has started!`
    );

    // Emit live events
    const populatedOrder = await Order.findById(savedOrder._id).populate('userId', 'name email phone studentId department');
    emitSocketEvent(req, order.userId.toString(), 'orderStatusChanged', populatedOrder);
    emitSocketEvent(req, 'admin', 'orderStatusChanged', populatedOrder);
    emitSocketEvent(req, 'canteen', 'orderStatusChanged', populatedOrder);

    res.json({ message: 'Payment approved successfully.', order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error approving payment', error: error.message });
  }
};

// @desc    Reject pending payment
// @route   POST /api/orders/:id/reject-payment
// @access  Private/Admin+Canteen
exports.rejectPayment = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (order.paymentStatus !== 'Awaiting Verification') {
      return res.status(400).json({ message: 'Order is not awaiting payment verification.' });
    }

    const previousStatus = order.status;

    order.paymentStatus = 'Failed';
    order.status = 'Cancelled';
    const savedOrder = await order.save();

    // Create Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action: 'Reject Payment',
      orderId: order._id,
      previousStatus,
      newStatus: 'Cancelled (Rejected)',
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
    });

    // Notify student
    const reasonText = rejectionReason ? ` Reason: ${rejectionReason}` : '';
    await createNotification(
      req,
      order.userId,
      'Payment Rejected',
      `Your payment screenshot for Order ${order.orderReference || order.tokenNumber} was rejected.${reasonText}`
    );

    // Emit live events
    const populatedOrder = await Order.findById(savedOrder._id).populate('userId', 'name email phone studentId department');
    emitSocketEvent(req, order.userId.toString(), 'orderStatusChanged', populatedOrder);
    emitSocketEvent(req, 'admin', 'orderStatusChanged', populatedOrder);
    emitSocketEvent(req, 'canteen', 'orderStatusChanged', populatedOrder);

    res.json({ message: 'Payment screenshot rejected and order cancelled.', order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error rejecting payment', error: error.message });
  }
};
