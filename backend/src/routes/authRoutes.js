const express = require('express');
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  loginAdmin,
  loginCanteen,
  forgotPassword,
  resetPassword,
  verifyOTP,
  resendOTP,
  getMe,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

router.post('/register', registerStudent);
router.post('/login', loginStudent);
router.post('/admin/login', loginAdmin);
router.post('/canteen/login', loginCanteen);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/me', protect, getMe);

module.exports = router;
