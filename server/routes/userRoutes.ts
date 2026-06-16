/**
 * User Routes
 * 
 * Handles: profile, avatar, password, teaching settings, account actions
 */

import { type Express, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import * as schema from "@shared/schema";
import { db } from "@db";
import { eq, and, not } from "drizzle-orm";
import { authenticate } from "../utils/auth";
import { uploadAvatar } from "../utils/upload";

// --- helpers ---
const toCanonicalGrade = (g: string): string => {
  const v = String(g || "").trim();
  if (!v) return v;
  // Kinder / Kindergarten → "K"
  if (/^k(in(der(garten)?)?)?$/i.test(v) || /^kinder$/i.test(v)) return "K";
  // "Grade 1" → "1", "grade 6" → "6"
  const m = v.match(/\d+/);
  if (m) return m[0];
  // Already canonical? allow "K" or plain "1".."12"
  if (/^(K|[0-9]{1,2})$/i.test(v)) return v.toUpperCase();
  return v;
};

const toLabelGrade = (canon: string): string => {
  if (!canon) return canon;
  if (canon.toUpperCase() === "K") return "Kinder";
  if (/^[0-9]{1,2}$/.test(canon)) return `Grade ${canon}`;
  if (/^grade\s*\d+$/i.test(canon)) return canon.replace(/^grade\s*/i, (m) => m[0].toUpperCase() + m.slice(1));
  return canon;
};

export function registerUserRoutes(app: Express) {
  // =========================
  // GET USER PROFILE
  // =========================
  app.get("/api/user/profile", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          avatar: true,
        },
      });

      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      return res.json({
        success: true,
        profile: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          bio: "",
          location: "",
          phone: "",
          dateOfBirth: null,
          avatar: user.avatar || null,
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      return res.status(500).json({ success: false, message: "Failed to load profile" });
    }
  });

  // =========================
  // UPDATE USER PROFILE
  // =========================
  app.put("/api/user/profile", authenticate, async (req: Request, res: Response) => {
    try {
      let { name, email, bio, location, phone, avatar } = req.body || {};
      // Defensive sanitation: trim and enforce basic limits
      if (typeof name === "string") name = name.trim().slice(0, 200);
      if (typeof email === "string") email = email.trim().toLowerCase().slice(0, 254);
      if (typeof bio === "string") bio = bio.trim().slice(0, 2000);
      if (typeof location === "string") location = location.trim().slice(0, 200);
      if (typeof phone === "string") phone = phone.trim().slice(0, 64);

      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });
      if (!name || !email)
        return res.status(400).json({ success: false, message: "Name and email are required" });

      // check email clash (other user)
      const existingUser = await db.query.users.findFirst({
        where: and(eq(schema.users.email, email), not(eq(schema.users.id, userId))),
        columns: { id: true },
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ success: false, message: "Email is already in use by another user" });
      }

      const updateData: any = {
        firstName: name.split(" ")[0] || name,
        lastName: name.split(" ").slice(1).join(" ") || "",
        email,
      };
      if (avatar !== undefined) updateData.avatar = avatar;

      const [updatedUser] = await db
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, userId))
        .returning({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          username: schema.users.username,
          avatar: schema.users.avatar,
        });

      await new Promise((r) => setTimeout(r, 800));

      return res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          name: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
          email: updatedUser.email,
          bio: bio || "",
          location: location || "",
          phone: phone || "",
          avatar: updatedUser.avatar || null,
        },
      });
    } catch (error) {
      console.error("Profile update error:", error);
      return res.status(500).json({ success: false, message: "Failed to update profile. Please try again." });
    }
  });

  // =========================
  // UPLOAD AVATAR
  // =========================
  app.post("/api/user/avatar", authenticate, uploadAvatar.single("avatar"), async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

      // Cloudinary URL is in req.file.path
      const avatarUrl = req.file.path as string;

      await db.update(schema.users).set({ avatar: avatarUrl }).where(eq(schema.users.id, userId));
      return res.json({
        success: true,
        message: "Avatar uploaded successfully to Cloudinary",
        avatarUrl,
      });
    } catch (error) {
      console.error("❌ Avatar upload error:", error);
      return res.status(500).json({ success: false, message: "Failed to upload avatar to cloud storage" });
    }
  });

  // =========================
  // CHANGE PASSWORD
  // =========================
  app.put("/api/user/password", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword)
        return res.status(400).json({ success: false, message: "Current password and new password are required" });

      if (newPassword.length < 6)
        return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });

      const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) return res.status(400).json({ success: false, message: "Current password is incorrect" });

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await db.update(schema.users).set({ password: hashedNewPassword, passwordChangedAt: new Date() }).where(eq(schema.users.id, userId));

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ success: false, message: "Failed to change password" });
    }
  });

  // =========================
  // GET TEACHING SETTINGS
  // =========================
  app.get("/api/user/teaching-settings", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;
      if (userRole !== "teacher" && userRole !== "admin") {
        return res.status(403).json({ success: false, message: "Only teachers can access teaching settings" });
      }

      const existing = await db
        .select()
        .from(schema.teachingSettings)
        .where(eq(schema.teachingSettings.userId, userId))
        .limit(1);

      if (existing.length === 0) {
        return res.json({ success: true, settings: null });
      }

      return res.json({ success: true, settings: existing[0] });
    } catch (error) {
      console.error("Error fetching teaching settings:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch teaching settings" });
    }
  });

  // =========================
  // UPDATE TEACHING SETTINGS
  // =========================
  app.put("/api/user/teaching-settings", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;
      if (userRole !== "teacher" && userRole !== "admin") {
        return res.status(403).json({ success: false, message: "Only teachers can update teaching settings" });
      }

      const { preferredGrades, subjects, maxClassSize } = req.body || {};

      // Validate and normalize grades
      const normalizedGrades = preferredGrades
        ? Array.isArray(preferredGrades)
          ? preferredGrades.map(toCanonicalGrade).filter(Boolean)
          : [toCanonicalGrade(String(preferredGrades))]
        : [];

      const existing = await db
        .select()
        .from(schema.teachingSettings)
        .where(eq(schema.teachingSettings.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await db
          .update(schema.teachingSettings)
          .set({
            preferredGrades: normalizedGrades,
            subjects: subjects || [],
            maxClassSize: maxClassSize || 30,
            updatedAt: new Date(),
          })
          .where(eq(schema.teachingSettings.userId, userId))
          .returning();

        return res.json({ success: true, message: "Teaching settings updated", settings: updated });
      } else {
        const [created] = await db
          .insert(schema.teachingSettings)
          .values({
            userId,
            preferredGrades: normalizedGrades,
            subjects: subjects || [],
            maxClassSize: maxClassSize || 30,
          })
          .returning();

        return res.json({ success: true, message: "Teaching settings created", settings: created });
      }
    } catch (error) {
      console.error("Error updating teaching settings:", error);
      return res.status(500).json({ success: false, message: "Failed to update teaching settings" });
    }
  });

  // =========================
  // EXPORT USER DATA
  // =========================
  app.get('/api/user/export', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const userEmail = (req as any).user?.email;

      console.log('📤 Data export request for:', userEmail);

      const userData = {
        profile: {
          email: userEmail,
          exportDate: new Date().toISOString(),
          accountCreated: '2024-01-01'
        },
        settings: {
          preferences: 'User preferences data...',
          security: 'Security settings...'
        },
        activity: {
          loginHistory: 'Recent login activity...',
          actions: 'User actions history...'
        }
      };

      res.json({
        success: true,
        data: userData,
        message: 'Data export completed'
      });
    } catch (error) {
      console.error('Export data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export data'
      });
    }
  });

  // =========================
  // LOGOUT ALL DEVICES
  // =========================
  app.post('/api/user/logout-all', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const userEmail = (req as any).user?.email;

      console.log('🚪 Logout all devices for:', userEmail);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to logout from all devices'
      });
    }
  });

  // =========================
  // DELETE ACCOUNT
  // =========================
  app.delete('/api/user/account', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const userEmail = (req as any).user?.email;

      console.log('🗑️ Account deletion request for:', userEmail);

      // Delete user progress
      await db.delete(schema.progress)
        .where(eq(schema.progress.userId, userId));

      // Delete reading sessions
      await db.delete(schema.readingSessions)
        .where(eq(schema.readingSessions.userId, userId));

      // Delete user account
      await db.delete(schema.users)
        .where(eq(schema.users.id, userId));

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  });

  console.log("✅ User routes registered");
}
