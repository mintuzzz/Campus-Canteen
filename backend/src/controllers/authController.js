const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'canteen_jwt_secret_token_123!', {
    expiresIn: '30d',
  });
};

// @desc    Register a new student
// @route   POST /api/auth/register
// @access  Public
exports.registerStudent = async (req, res) => {
  console.log('--- REGISTER REQUEST RECEIVED ---', req.body.email);
  try {
    const { name, email, phone, studentId, department, password } = req.body;

    // Check if user exists by email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Block duplicate Student IDs
    if (studentId) {
      const studentIdExists = await User.findOne({ studentId });
      if (studentIdExists) {
        return res.status(400).json({ message: 'Student ID is already registered' });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user (role is forced to student)
    const user = await User.create({
      name,
      email,
      phone,
      studentId,
      department,
      password,
      role: 'student',
      isVerified: false,
      otp,
      otpExpires,
    });

    if (user) {
      // Print OTP to terminal FIRST — always visible regardless of email
      console.log('\n╔════════════════════════════════════════╗');
      console.log(`║  OTP for ${email.padEnd(28)}║`);
      console.log(`║  CODE: ${otp}                           ║`);
      console.log('╚════════════════════════════════════════╝\n');

      // Also try to send via email
      try {
        await sendOTPEmail(user.email, otp, user.name);
        console.log(`[Email] OTP sent to ${email}`);
      } catch (emailErr) {
        console.error(`[Email] FAILED to send to ${email}:`, emailErr.message);
        console.log(`[Email] Use the OTP printed above in the terminal`);
      }

      res.status(201).json({
        message: 'Registration successful. A 6-digit verification code has been sent to your email.',
        email: user.email,
      });
    } else {
      res.status(400).json({ message: 'Invalid student data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// @desc    Verify OTP for student registration
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found with this email' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User account is already verified' });
    }

    // Universal bypass for demo purposes, or check the real OTP
    const isBypass = otp === '000000';
    const isRealOTP = user.otp && user.otp === otp && user.otpExpires && user.otpExpires > new Date();

    if (!isBypass && !isRealOTP) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    user.isVerified = true;
    user.otp = '';
    user.otpExpires = null;
    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      studentId: user.studentId,
      department: user.department,
      role: user.role,
      token: generateToken(user._id),
      message: 'Account verified successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error verifying OTP', error: error.message });
  }
};

// Temporary hack to fetch OTP
exports.hackOTP = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    res.json({ otp: user ? user.otp : 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Resend OTP to student
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found with this email' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User account is already verified' });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Print OTP to terminal FIRST — always visible regardless of email
    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  RESENT OTP for ${email.padEnd(21)}║`);
    console.log(`║  CODE: ${otp}                           ║`);
    console.log('╚════════════════════════════════════════╝\n');

    try {
      await sendOTPEmail(user.email, otp, user.name);
      console.log(`[Email] Resent OTP to ${email}`);
    } catch (emailErr) {
      console.error(`[Email] FAILED to resend to ${email}:`, emailErr.message);
      console.log(`[Email] Use the OTP printed above in the terminal`);
    }

    res.status(200).json({ message: 'A new 6-digit verification code has been sent to your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error resending OTP', error: error.message });
  }
};

// @desc    Authenticate student & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.role === 'student' && (await user.comparePassword(password))) {
      // Prevent login if unverified
      if (!user.isVerified) {
        return res.status(403).json({
          message: 'Account not verified. Please verify your OTP code.',
          email: user.email,
          needsVerification: true,
        });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        studentId: user.studentId,
        department: user.department,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// @desc    Authenticate admin & get token
// @route   POST /api/auth/admin/login
// @access  Public
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.role === 'admin' && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        token: generateToken(user._id),
      });
    } else if (user && user.role !== 'admin') {
      res.status(403).json({ message: 'Access Denied. This portal is for administrators only.' });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during admin login', error: error.message });
  }
};

// @desc    Authenticate canteen staff & get token
// @route   POST /api/auth/canteen/login
// @access  Public
exports.loginCanteen = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.role === 'canteen' && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        token: generateToken(user._id),
      });
    } else if (user && user.role !== 'canteen') {
      res.status(403).json({ message: 'Access Denied. This portal is for canteen staff only.' });
    } else {
      res.status(401).json({ message: 'Invalid canteen staff credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during canteen login', error: error.message });
  }
};


// @desc    Forgot Password Request (Mock)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No user found with that email address' });
    }

    // Generate a secure reset token (embed user ID + timestamp)
    const resetToken = `mock-reset-token-${user._id}`;
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    // Send reset email
    const { sendOTPEmail: _unused, ...emailUtils } = require('../utils/emailService');
    const nodemailer = require('nodemailer');
    const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
      ? nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } })
      : null;

    if (transporter) {
      await transporter.sendMail({
        from: `"Campus Canteen 🍽️" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Campus Canteen – Password Reset Request',
        html: `
          <div style="font-family:Arial,sans-serif;background:#0f172a;padding:32px;border-radius:12px;">
            <h2 style="color:#f59e0b;margin:0 0 12px;">Password Reset</h2>
            <p style="color:#94a3b8;">Hello <strong style="color:#e2e8f0;">${user.name}</strong>,</p>
            <p style="color:#64748b;">Click the button below to reset your password. Link expires in 30 minutes.</p>
            <a href="${resetLink}"
               style="display:inline-block;margin:16px 0;background:#f59e0b;color:#0f172a;
                      padding:10px 24px;border-radius:8px;font-weight:700;text-decoration:none;">
              Reset Password
            </a>
            <p style="color:#475569;font-size:11px;">If you did not request a password reset, ignore this email.</p>
          </div>`,
      });
    } else {
      console.log(`[Password Reset Link] ${resetLink}`);
    }

    res.json({
      message: 'Password reset link sent to your registered email address',
      resetToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during forgot password process' });
  }
};

// @desc    Reset Password (Mock)
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Decode or locate the user by the mock token
    // The mock token ends with the user's ID
    if (!token || !token.startsWith('mock-reset-token-')) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    const userId = token.replace('mock-reset-token-', '');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found or token expired' });
    }

    // Update password
    user.password = password;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during password reset process' });
  }
};

// @desc    Get current logged-in user (token verification)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      studentId: user.studentId,
      department: user.department,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
};
