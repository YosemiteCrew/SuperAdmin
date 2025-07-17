import crypto from "crypto";
import bcrypt from "bcrypt";
import validator from "validator";
import jwt from "jsonwebtoken";
import AWS from "aws-sdk";
import { Request, Response } from "express";
import AdminUser, { IAdminUser } from "../models/adminUser";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

// AWS SES Config
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

const APP_NAME = process.env.APP_NAME || "Yosemite";

const authController = {
  // Send verification email
  sendEmail: async (req: Request, res: Response): Promise<void> => {
    try {
      const { toEmail, code } = req.body;

      const errors: { field: string; message: string }[] = [];

      // Email validations
      if (!toEmail) {
        errors.push({ field: "toEmail", message: "Email is required" });
      } else if (!validator.isEmail(toEmail)) {
        errors.push({ field: "toEmail", message: "Invalid email format" });
      }

      // Code validations
      if (!code) {
        errors.push({ field: "code", message: "Code is required" });
      } else if (!/^\d{6}$/.test(code)) {
        errors.push({
          field: "code",
          message: "Code must be 6 digits and numbers only",
        });
      }

      // If validation errors
      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      const params = {
        Source: process.env.AWS_MAIL_DRIVER!,
        Destination: {
          ToAddresses: [toEmail],
        },
        Message: {
          Subject: { Data: "Your Signup Verification Code" },
          Body: {
            Text: { Data: `Your verification code is: ${code}` },
          },
        },
      };

      await ses.sendEmail(params).promise();

      res.status(200).json({
        success: true,
        message: "Verification email sent successfully.",
      });
    } catch (error: any) {
      console.error("SES sendEmail error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send verification email.",
        error: error.message,
      });
    }
  },
  // userDetail
  userDetail: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({
          success: false,
          message: "Request body is missing or invalid",
        });
        return;
      }
      const { email } = req.body;

      const errors: { field: string; message: string }[] = [];

      
      

      // Email validations
      if (!email) {
        errors.push({ field: "email", message: "Email is required" });
      } else if (!validator.isEmail(email)) {
        errors.push({ field: "email", message: "Invalid email format" });
      }

      // If validation errors
      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      // Check if user already exists
      const existingUser = await AdminUser.findOne({ email }).select('-password');
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: "User already exists with this email",
        });
        return;
      }

      res.status(201).json({
      success: true,
      message: "valid email for signup",
    });

    } catch (error: any) {
      console.error("userDetail error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get userDetail",
        error: error.message,
      });
    }
  },
  // signUp
  signUp: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({
          success: false,
          message: "Request body is missing or invalid",
        });
        return;
      }
      const { email, password, userType } = req.body;

      const errors: { field: string; message: string }[] = [];

      
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
      const allowedUserTypes = ["admin", "user"];

      // Email validations
      if (!email) {
        errors.push({ field: "email", message: "Email is required" });
      } else if (!validator.isEmail(email)) {
        errors.push({ field: "email", message: "Invalid email format" });
      }

      // Validate password
      if (!password) {
        errors.push({ field: "password", message: "Password is required" });
      } else if (!passwordRegex.test(password)) {
        errors.push({
          field: "password",
          message: "Password must be 8+ chars with upper, lower, and special character",
        });
      }

      // Validate userType
      if (!userType) {
        errors.push({ field: "userType", message: "User type is required" });
      } else if (!allowedUserTypes.includes(userType)) {
        errors.push({ field: "userType", message: "User type must be either 'admin' or 'user'" });
      }

     

      // If validation errors
      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      // Check if user already exists
      const existingUser = await AdminUser.findOne({ email });
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: "User already exists with this email",
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      
    // Create user
    const newUser = new AdminUser({
      email,
      password: hashedPassword,
      userType,
      status: 0,
      twoFAEnabled: false,
      twoFASecret: "", // Will be set after QR generation & verification
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "Signup successful. Please set up 2FA.",
      userId: newUser._id,
      email: newUser.email,
    });

    } catch (error: any) {
      console.error("signup error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to signup",
        error: error.message,
      });
    }
  },

  // signin
  signin: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({
          success: false,
          message: "Request body is missing or invalid",
        });
        return;
      }
      const { email, password } = req.body;

      const errors: { field: string; message: string }[] = [];

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

      // Email validations
      if (!email) {
        errors.push({ field: "email", message: "Email is required" });
      } else if (!validator.isEmail(email)) {
        errors.push({ field: "email", message: "Invalid email format" });
      }

      // Password validations
      if (!password) {
        errors.push({ field: "password", message: "Password is required" });
      } else if (!passwordRegex.test(password)) {
        errors.push({
          field: "password",
          message:
            "Password must be at least 8 characters long and include uppercase, lowercase, and special characters",
        });
      }

      // If validation errors
      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      // Find user
      const existingUser = await AdminUser.findOne({ email });

      if (!existingUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Compare password
      const isPasswordMatch = await bcrypt.compare(password, existingUser.password);

      if (!isPasswordMatch) {
        res.status(401).json({
          success: false,
          message: "Incorrect password",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "2FA verification required",
        twoFA: true,
        twoFASecret: existingUser.twoFASecret,
      });
    } catch (error: any) {
      console.error("Signin error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to Signin",
        error: error.message,
      });
    }
  },
  

  // Generate 2FA QR code
  generate2FA: async (req: Request, res: Response): Promise<void> => {
    try {
      const email = (req.query.email as string);
      const errors: { field: string; message: string }[] = [];

      // Email validations
      if (!email) {
        errors.push({ field: "email", message: "Email is required" });
      } else if (!validator.isEmail(email)) {
        errors.push({ field: "email", message: "Invalid email format" });
      }
      // If validation errors
      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      const secret = speakeasy.generateSecret({
        name: `${APP_NAME} (${email})`,
      });

      const qrCode = await QRCode.toDataURL(secret.otpauth_url || "");

      res.status(200).json({
        success: true,
        qrCode,
        base32: secret.base32,
      });
    } catch (error: any) {
      console.error("2FA QR generation failed:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate QR code",
        error: error.message,
      });
    }
  },
 

  //  Verify 2FA token
  verify2FA: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, token, secret } = req.body;
      
      const errors: { field: string; message: string }[] = [];
      // Email validations
      if (!email) {
        errors.push({ field: "email", message: "Email is required" });
      } else if (!validator.isEmail(email)) {
        errors.push({ field: "email", message: "Invalid email format" });
      }

      if (!token) {
        errors.push({ field: "token", message: "Token is required" });
      } 
      if (!secret) {
        errors.push({ field: "secret", message: "Secret is required" });
      } 

       // If validation errors
      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

     

      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token,
        window: 1,
      });

      if (!verified) {
        res.status(401).json({
          success: false,
          message: "Invalid 2FA code",
        });
        return;
      }

      // Check  user  exists
      const existingUser = await AdminUser.findOne({ email });
      if (!existingUser) {
        res.status(409).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      await AdminUser.findOneAndUpdate(
        { email },
        { twoFAEnabled: true, twoFASecret: secret }
      );

      
      // Generate JWT token
      const tokenjwt = jwt.sign(
        { userId: existingUser._id },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      // Send success response
      res.status(200).json({
        success: true,
        message: "2FA verified successfully",
        tokenjwt,
      });
      

      
    } catch (error: any) {
      console.error("2FA verification error:", error);
      res.status(500).json({
        success: false,
        message: "Error verifying 2FA",
        error: error.message,
      });
    }
  },

  // forgot Password
  forgotPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({
          success: false,
          message: "Request body is missing or invalid",
        });
        return;
      }
      const { email } = req.body;

      const errors: { field: string; message: string }[] = [];

    

      // Email validations
      if (!email) {
        errors.push({ field: "email", message: "Email is required" });
      } else if (!validator.isEmail(email)) {
        errors.push({ field: "email", message: "Invalid email format" });
      }

      

      // If validation errors
      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      // Find user
      const existingUser = await AdminUser.findOne({ email }).select('-password');

      if (!existingUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      

      res.status(200).json({
        success: true,
        message: "User detail",
        data:existingUser
      });
    } catch (error: any) {
     
      res.status(500).json({
        success: false,
        message: "Failed to forgot password",
        error: error.message,
      });
    }
  },
  // Reset password
  resetPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({
          success: false,
          message: "Request body is missing or invalid",
        });
        return;
      }
      const { email, password, confirmPassword } = req.body;

      const errors: { field: string; message: string }[] = [];

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

      // Email validations
      if (!email) {
        errors.push({ field: "email", message: "Email is required" });
      } else if (!validator.isEmail(email)) {
        errors.push({ field: "email", message: "Invalid email format" });
      }

      // Password validations
      if (!password) {
        errors.push({ field: "password", message: "Password is required" });
      } else if (!passwordRegex.test(password)) {
        errors.push({
          field: "password",
          message:
            "Password must be at least 8 characters long and include uppercase, lowercase, and special characters",
        });
      } else if (password !== confirmPassword) {
        errors.push({
          field: "password",
          message:
            "Passwords do not match",
        });
      }

      

      // If validation errors
      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      // Find user
      const existingUser = await AdminUser.findOne({ email }).select('-password -twoFASecret');

      if (!existingUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await AdminUser.findOneAndUpdate(
        { email },
        { password: hashedPassword }
      );

      

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
        data:existingUser
      });
    } catch (error: any) {
     
      res.status(500).json({
        success: false,
        message: "Failed to forgot password",
        error: error.message,
      });
    }
  },
};

export default authController;
