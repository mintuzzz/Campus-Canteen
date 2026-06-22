const express = require('express');
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  loginAdmin,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

router.post('/register', registerStudent);
router.post('/login', loginStudent);
router.post('/admin/login', loginAdmin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
