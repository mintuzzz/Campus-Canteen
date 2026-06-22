const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'canteen_jwt_secret_token_123!', {
    expiresIn: '30d',
  });
};

// @desc    Register a new student
// @route   POST /api/auth/register
// @access  Public
exports.registerStudent = async (req, res) => {
  try {
    const { name, email, phone, studentId, department, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      studentId,
      department,
      password,
      role: 'student',
    });

    if (user) {
      res.status(201).json({
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
      res.status(400).json({ message: 'Invalid student data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
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
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during admin login', error: error.message });
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

    // In a real application, we would send an email with a reset link and a secure token.
    // Here we will just return success and a mock token for frontend demo.
    res.json({
      message: 'Password reset link sent to your registered email address',
      resetToken: 'mock-reset-token-' + user._id,
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
