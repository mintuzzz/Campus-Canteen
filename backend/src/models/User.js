const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  studentId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allow admins/non-students to not have studentId or have it empty
  },
  department: {
    type: String,
    trim: true,
    default: '',
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'canteen', 'admin'],
    default: 'student',
  },
  isVerified: {
    type: Boolean,
    default: true,
  },
  otp: {
    type: String,
    default: '',
  },
  otpExpires: {
    type: Date,
    default: null,
  },
  warningCount: {
    type: Number,
    default: 0,
  },
  noShowCount: {
    type: Number,
    default: 0,
  },
  penaltyStatus: {
    type: String,
    enum: ['None', 'Suspended'],
    default: 'None',
  },
  suspensionUntil: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
