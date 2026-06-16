/**
 * Teacher Routes
 * 
 * Handles: teacher listing, approve, reject
 */

import { type Express, type Request, type Response } from "express";
import * as schema from "@shared/schema";
import { db } from "@db";
import { eq, and, or, like, asc } from "drizzle-orm";
import { authenticate, authorize } from "../utils/auth";
import { parseNumericId, escapeLike } from "../utils/helpers";

export function registerTeacherRoutes(app: Express) {
  // =========================
  // LIST TEACHERS (admin only)
  // =========================
  app.get("/api/teachers", authenticate, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const approvalStatus = req.query.status as string;
      const search = req.query.search as string;

      const conditions: any[] = [eq(schema.users.role, "teacher")];
      if (approvalStatus && ["pending", "approved", "rejected"].includes(approvalStatus)) {
        conditions.push(eq(schema.users.approvalStatus, approvalStatus as any));
      }
      if (search?.trim()) {
        const term = escapeLike(search.trim()).slice(0, 100);
        conditions.push(
          or(
            like(schema.users.firstName, `%${term}%`),
            like(schema.users.lastName, `%${term}%`),
            like(schema.users.email, `%${term}%`),
            like(schema.users.username, `%${term}%`)
          )
        );
      }

      const teachers = await db.select().from(schema.users).where(and(...conditions)).orderBy(asc(schema.users.lastName));
      return res.status(200).json({ teachers });
    } catch (error) {
      console.error("Error fetching teachers:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // APPROVE TEACHER (admin only)
  // =========================
  app.post("/api/teachers/:id/approve", authenticate, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const teacherId = parseNumericId(req.params.id);
      if (!teacherId) return res.status(400).json({ message: "Invalid teacher id" });

      const teacher = await db.query.users.findFirst({
        where: and(eq(schema.users.id, teacherId), eq(schema.users.role, "teacher")),
      });
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });

      const [updatedTeacher] = await db
        .update(schema.users)
        .set({ approvalStatus: "approved" })
        .where(eq(schema.users.id, teacherId))
        .returning();

      return res.status(200).json({ message: "Teacher account approved successfully", teacher: updatedTeacher });
    } catch (error) {
      console.error("Error approving teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // REJECT TEACHER (admin only)
  // =========================
  app.post("/api/teachers/:id/reject", authenticate, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const teacherId = parseNumericId(req.params.id);
      if (!teacherId) return res.status(400).json({ message: "Invalid teacher id" });

      const { reason } = req.body;

      const teacher = await db.query.users.findFirst({
        where: and(eq(schema.users.id, teacherId), eq(schema.users.role, "teacher")),
      });
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });

      const [updatedTeacher] = await db
        .update(schema.users)
        .set({ approvalStatus: "rejected", rejectionReason: reason || null })
        .where(eq(schema.users.id, teacherId))
        .returning();

      return res.status(200).json({ message: "Teacher account rejected", teacher: updatedTeacher });
    } catch (error) {
      console.error("Error rejecting teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  console.log("✅ Teacher routes registered");
}
