import express, { Request, Response, Router } from 'express';
import authController from '../controllers/authController';

const router: Router = express.Router();

// Send Email
router.post('/send-email', authController.sendEmail);

// Single User detail
router.post('/user-detail', authController.userDetail);

// Signup
router.post('/signup', authController.signUp);

// Generate 2FA QR
router.get('/2fa/generate', authController.generate2FA);

// Verify 2FA token
router.post('/2fa/verify', authController.verify2FA);

// Login
router.post('/signin', authController.signin);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password', authController.resetPassword);

export default router;