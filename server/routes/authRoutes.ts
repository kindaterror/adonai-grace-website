/**
 * Authentication Routes
 * 
 * Handles: login, register, email verification, password reset
 */

import { type Express, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as schema from "@shared/schema";
import { db } from "@db";
import { eq, or, and } from "drizzle-orm";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../utils/emailService";
import crypto from "crypto";
import { resetExpiresAt, verifyExpiresAt, RESET_TTL_MIN } from "../utils/ttl";
import { simpleRateLimit } from "../utils/rateLimit";
import { JWT_SECRET } from "@server/routes/jwtConfig";

const loginLimiter = simpleRateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const forgotPasswordLimiter = simpleRateLimit({ windowMs: 60 * 60 * 1000, max: 3 });
const resendVerifyLimiter = simpleRateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
const securityResetLimiter = simpleRateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

export function registerAuthRoutes(app: Express) {
  // =========================
  // EMAIL VERIFICATION
  // =========================
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ success: false, message: "Verification token is required" });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const user = await db.query.users.findFirst({
        where: eq(schema.users.emailVerificationToken, tokenHash),
      });

      if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired verification token" });
      }

      const now = new Date();
      if (user.emailVerificationExpires && user.emailVerificationExpires < now) {
        return res.status(400).json({ success: false, message: "Verification token has expired" });
      }

      await db.update(schema.users)
        .set({ 
          emailVerified: true, 
          emailVerificationToken: null, 
          emailVerificationExpires: null
        })
        .where(eq(schema.users.id, user.id));

      res.json({ success: true, message: "Email verified successfully! You can now log in." });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ success: false, message: "Failed to verify email" });
    }
  });

  // =========================
  // RESEND VERIFICATION EMAIL
  // =========================
  app.post("/api/auth/resend-verification", resendVerifyLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }

      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email),
      });

      if (!user) {
        return res.json({ success: true, message: "If that email exists, a verification email will be sent" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ success: false, message: "Email is already verified" });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");
      const expiresAt = verifyExpiresAt();

      await db.update(schema.users)
        .set({ 
          emailVerificationToken: tokenHash, 
          emailVerificationExpires: expiresAt 
        })
        .where(eq(schema.users.id, user.id));

      await sendVerificationEmail(email, verificationToken, user.username || "User");
      res.json({ success: true, message: "Verification email sent. Please check your inbox." });
    } catch (error) {
      console.error("Error resending verification:", error);
      res.status(500).json({ success: false, message: "Failed to resend verification email" });
    }
  });

  // =========================
  // FORGOT PASSWORD
  // =========================
  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }

      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email),
      });

      if (!user) {
        return res.json({ success: true, message: "If that email exists, a password reset link will be sent" });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
      const expiresAt = resetExpiresAt();

      await db.update(schema.users)
        .set({ 
          passwordResetToken: tokenHash, 
          passwordResetExpires: expiresAt 
        })
        .where(eq(schema.users.id, user.id));

      await sendPasswordResetEmail(email, resetToken, user.username || "User");
      res.json({ success: true, message: "Password reset link sent to your email" });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ success: false, message: "Failed to process forgot password request" });
    }
  });

  // =========================
  // RESET PASSWORD
  // =========================
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: "Token and new password are required" });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const user = await db.query.users.findFirst({
        where: eq(schema.users.passwordResetToken, tokenHash),
      });

      if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
      }

      if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
        return res.status(400).json({ success: false, message: "Reset token has expired" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(schema.users)
        .set({ 
          password: hashedPassword, 
          passwordResetToken: null, 
          passwordResetExpires: null,
          passwordChangedAt: new Date()
        })
        .where(eq(schema.users.id, user.id));

      res.json({ success: true, message: "Password reset successfully! You can now log in with your new password." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ success: false, message: "Failed to reset password" });
    }
  });

  // =========================
  // TEST EMAIL (DEV ONLY)
  // =========================
  app.get("/api/test-email", async (req: Request, res: Response) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(404).json({ message: "Not found" });
      }
      await sendWelcomeEmail("test@example.com", "Test User", "student");
      res.json({ success: true, message: "Test email sent!" });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ success: false, message: "Failed to send test email" });
    }
  });

  // =========================
  // REGISTER
  // =========================
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = req.body;
      
      const existingUser = await db.query.users.findFirst({
        where: or(
          eq(schema.users.email, userData.email), 
          eq(schema.users.username, userData.username)
        ),
      });

      if (existingUser) {
        if (existingUser.email === userData.email) {
          return res.status(400).json({ success: false, message: "Email already registered" });
        }
        return res.status(400).json({ success: false, message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");
      const expiresAt = verifyExpiresAt();

      const [newUser] = await db.insert(schema.users).values({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || "student",
        gradeLevel: userData.gradeLevel || null,
        emailVerificationToken: tokenHash,
        emailVerificationExpires: expiresAt,
        approvalStatus: userData.role === "teacher" ? "pending" : "approved",
      }).returning({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        role: schema.users.role,
        gradeLevel: schema.users.gradeLevel,
        emailVerified: schema.users.emailVerified,
        approvalStatus: schema.users.approvalStatus,
      });

      await sendVerificationEmail(userData.email, verificationToken, userData.firstName || userData.username || "User");
      res.status(201).json({ 
        success: true, 
        message: "Registration successful! Please check your email to verify your account.",
        user: newUser
      });
    } catch (error) {
      console.error("Error in registration:", error);
      res.status(500).json({ success: false, message: "Registration failed" });
    }
  });

  // =========================
  // LOGIN
  // =========================
  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
      }

      const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
      if (!user) {
        return res.status(400).json({ success: false, message: "Invalid email or password" });
      }

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        // Track failed attempts
        if (user.loginAttempts !== null && user.loginAttempts !== undefined) {
          await db.update(schema.users)
            .set({ loginAttempts: (user.loginAttempts || 0) + 1, lastFailedLoginAt: new Date() })
            .where(eq(schema.users.id, user.id));
        }
        return res.status(400).json({ success: false, message: "Invalid email or password" });
      }

      // Check approval status for teachers/students
      if (user.approvalStatus === "pending") {
        return res.status(403).json({ success: false, message: "Your account is pending approval" });
      }
      if (user.approvalStatus === "rejected") {
        return res.status(403).json({ success: false, message: "Your account has been rejected" });
      }

      // Reset failed login attempts
      await db.update(schema.users)
        .set({ loginAttempts: 0, lastFailedLoginAt: new Date(0) })
        .where(eq(schema.users.id, user.id));

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          gradeLevel: user.gradeLevel,
          avatar: user.avatar,
        }
      });
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  // =========================
  // GET CURRENT USER
  // =========================
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      const userId = decoded.id;

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          gradeLevel: true,
          avatar: true,
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(401).json({ success: false, message: "Invalid token" });
    }
  });

  console.log("✅ Auth routes registered");
}
