const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const statusController = require('../controllers/statusController');
const { authMiddleWare } = require('../middleware/authmiddleware');
const { otpRateLimiter } = require('../middleware/rateLimiter');
const { multerMiddleWare } = require('../src/cloudaniry');

// OTP Authentication Endpoints
router.post('/send-otp', otpRateLimiter, authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', otpRateLimiter, authController.resendOtp);

// Profile Setup
router.post('/complete-profile', authMiddleWare, multerMiddleWare, authController.completeProfile);
router.post('/update-profile', authMiddleWare, multerMiddleWare, authController.completeProfile); // backward compatibility

// Token & Session Management
router.post('/refresh', authController.refreshToken);
router.post('/logout', authMiddleWare, authController.logout);
router.get('/logout', authMiddleWare, authController.logout); // fallback
router.post('/logout-all', authMiddleWare, authController.logoutAll);
router.get('/me', authMiddleWare, authController.getMe);
router.get('/profile', authMiddleWare, authController.getMe); // backward compatibility

// Contacts / User Directory
router.get('/get-all-users', authMiddleWare, authController.getAllUsers);

// User status privacy settings
router.patch('/status-privacy', authMiddleWare, statusController.updateStatusPrivacy);

module.exports = router;
