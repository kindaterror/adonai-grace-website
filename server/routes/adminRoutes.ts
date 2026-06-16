/**
 * Admin Routes
 * 
 * Handles: system settings, maintenance mode, stats
 */

import { type Express, type Request, type Response } from "express";
import * as schema from "@shared/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { authenticate, requireAdmin, authorize } from "../utils/auth";

// Maintenance mode state (in-memory)
let maintenanceMode = false;

// Stats handler
const statsHandler = async (req: Request, res: Response) => {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    // Simple stats - in production would be more comprehensive
    const [userCount, bookCount, progressCount] = await Promise.all([
      db.select({ count: schema.users.id }).from(schema.users),
      db.select({ count: schema.books.id }).from(schema.books),
      db.select({ count: schema.progress.id }).from(schema.progress),
    ]);
    
    res.json({
      totalUsers: userCount.length,
      totalBooks: bookCount.length,
      totalProgress: progressCount.length,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export function registerAdminRoutes(app: Express) {
  // =========================
  // GET SYSTEM SETTINGS
  // =========================
  app.get("/api/admin/system-settings", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      let settings = await db.query.systemSettings.findFirst();
      if (!settings) {
        const [newSettings] = await db
          .insert(schema.systemSettings)
          .values({
            allowNewRegistrations: true,
            requireEmailVerification: false,
            autoApproveTeachers: false,
            autoApproveStudents: false,
          })
          .returning();
        settings = newSettings;
      }

      res.json({
        success: true,
        settings: {
          maintenanceMode,
          allowNewRegistrations: settings.allowNewRegistrations,
          requireEmailVerification: settings.requireEmailVerification,
          autoApproveTeachers: settings.autoApproveTeachers,
          autoApproveStudents: settings.autoApproveStudents,
          sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 60,
          maxLoginAttempts: settings.maxLoginAttempts ?? 5,
          requireStrongPasswords: settings.requireStrongPasswords ?? false,
        },
      });
    } catch (error) {
      console.error("Get system settings error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch system settings" });
    }
  });

  // =========================
  // UPDATE SYSTEM SETTINGS
  // =========================
  app.put("/api/admin/system-settings", authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const {
        maintenanceMode: newMaintenanceMode,
        allowNewRegistrations,
        requireEmailVerification,
        autoApproveTeachers,
        autoApproveStudents,
        sessionTimeoutMinutes,
        maxLoginAttempts,
        requireStrongPasswords,
      } = req.body;

      maintenanceMode = newMaintenanceMode;

      if (sessionTimeoutMinutes < 1 || sessionTimeoutMinutes > 480) {
        return res
          .status(400)
          .json({ success: false, message: "Session timeout must be between 15 and 480 minutes" });
      }
      if (maxLoginAttempts < 3 || maxLoginAttempts > 10) {
        return res.status(400).json({ success: false, message: "Max login attempts must be between 3 and 10" });
      }

      const settingsToSave = {
        allowNewRegistrations: allowNewRegistrations ?? true,
        requireEmailVerification: requireEmailVerification ?? false,
        autoApproveTeachers: autoApproveTeachers ?? false,
        autoApproveStudents: autoApproveStudents ?? false,
        sessionTimeoutMinutes: sessionTimeoutMinutes ?? 60,
        maxLoginAttempts: maxLoginAttempts ?? 5,
        requireStrongPasswords: requireStrongPasswords ?? false,
      };

      const validated = schema.updateSystemSettingsSchema.parse(settingsToSave);

      let existing = await db.query.systemSettings.findFirst();
      if (existing) {
        await db
          .update(schema.systemSettings)
          .set({ ...validated, updatedAt: new Date() })
          .where(eq(schema.systemSettings.id, existing.id))
          .returning();
      } else {
        await db.insert(schema.systemSettings).values(validated).returning();
      }

      res.json({ success: true, message: "System settings saved successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ success: false, message: "Validation error", errors: error.errors });
      }
      console.error("Update system settings error:", error);
      res.status(500).json({ success: false, message: "Failed to save system settings" });
    }
  });

  // =========================
  // GET STATS (admin/teacher)
  // =========================
  app.get("/api/stats", authenticate, authorize(["admin", "teacher"]), statsHandler);

  console.log("✅ Admin routes registered");
}

// Export maintenance mode setter for external use
export const setMaintenanceMode = (mode: boolean) => {
  maintenanceMode = mode;
};

export const getMaintenanceMode = () => maintenanceMode;
