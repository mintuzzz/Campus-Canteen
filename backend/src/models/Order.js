const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodItem',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [OrderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['Razorpay UPI', 'Card Payment', 'Cash On Pickup', 'UPI'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending Payment', 'Pending', 'Paid', 'Failed', 'Refunded', 'Awaiting Verification'],
    default: 'Pending Payment',
  },
  status: {
    type: String,
    enum: ['Pending Payment', 'Pending', 'Paid', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled', 'Refunded', 'Awaiting Verification'],
    default: 'Pending Payment',
  },
  orderReference: {
    type: String,
    unique: true,
    sparse: true,
  },
  transactionId: {
    type: String,
    sparse: true,
  },
  paymentScreenshot: {
    type: String,
    default: '',
  },
  ocrResult: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  tokenNumber: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    default: '',
  },
  // pickupToken is the canonical CC-YYYY-XXXXXX token shown to students for manual verification
  pickupToken: {
    type: String,
    default: '',
  },
  tokenVerified: {
    type: Boolean,
    default: false,
  },
  qrCode: {
    type: String,
    default: '',
  },
  isScanned: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  razorpayOrderId: {
    type: String,
    default: '',
  },
  razorpayPaymentId: {
    type: String,
    default: '',
  },
  pickupTime: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

OrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderReference) {
    const year = new Date().getFullYear();
    let prefix = 'CC';
    try {
      const Settings = require('./Settings');
      const paymentSettings = await Settings.findOne({ key: 'payment' });
      if (paymentSettings && paymentSettings.value && paymentSettings.value.notePrefix) {
        prefix = paymentSettings.value.notePrefix;
      }
    } catch (e) {
      console.warn('Pre-save settings fetch failed, using default prefix CC:', e.message);
    }

    // Retry loop to handle concurrent save race conditions
    let assigned = false;
    let attempts = 0;
    while (!assigned && attempts < 10) {
      attempts++;
      const regex = new RegExp(`^${prefix}-${year}-\\d{6}$`);
      const latestOrder = await this.constructor.findOne({ orderReference: { $regex: regex } })
        .sort({ orderReference: -1 });

      let nextNum = 1;
      if (latestOrder && latestOrder.orderReference) {
        const parts = latestOrder.orderReference.split('-');
        const lastNumStr = parts[parts.length - 1];
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }

      // Add small random jitter on retry to reduce collision probability
      if (attempts > 1) {
        nextNum += Math.floor(Math.random() * 5);
      }

      const candidate = `${prefix}-${year}-${String(nextNum).padStart(6, '0')}`;
      // Check if this candidate is already taken
      const conflict = await this.constructor.findOne({ orderReference: candidate });
      if (!conflict) {
        this.orderReference = candidate;
        assigned = true;
      }
    }

    if (!assigned) {
      return next(new Error('Could not assign a unique order reference after 10 attempts.'));
    }
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
