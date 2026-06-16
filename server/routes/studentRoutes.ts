/**
 * Student Routes
 * 
 * Handles: student listing, pending, approve, reject
 */

import { type Express, type Request, type Response } from "express";
import * as schema from "@shared/schema";
import { db } from "@db";
import { eq, and, or, like, inArray, asc } from "drizzle-orm";
import { authenticate, authorize } from "../utils/auth";
import { storage } from "../storage";
import { toCanonicalGrade, parseNumericId, escapeLike } from "../utils/helpers";

export function registerStudentRoutes(app: Express) {
  // =========================
  // LIST STUDENTS (admin/teacher)
  // =========================
  app.get("/api/students", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const approvalStatus = (req.query.status as string) || "";
      const gradeLevelQ = (req.query.grade as string) || "all";
      const search = (req.query.search as string) || "";
      const userRole = (req as any).user?.role;
      const userId = (req as any).user?.id;

      const conditions: any[] = [eq(schema.users.role, "student")];

      // status filter
      if (approvalStatus && ["pending", "approved", "rejected"].includes(approvalStatus)) {
        conditions.push(eq(schema.users.approvalStatus, approvalStatus as any));
      }

      // grade filter (query param)
      if (gradeLevelQ && gradeLevelQ !== "all") {
        const g = toCanonicalGrade(gradeLevelQ);
        conditions.push(eq(schema.users.gradeLevel, g as any));
      }

      // text search
      if (search.trim()) {
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

      // teacher settings narrowing (grades)
      if (userRole === "teacher") {
        const teacherSettings = await db
          .select()
          .from(schema.teachingSettings)
          .where(eq(schema.teachingSettings.userId, userId))
          .limit(1);

        if (teacherSettings.length > 0 && teacherSettings[0].preferredGrades?.length) {
          const canon = teacherSettings[0].preferredGrades
            .map((g: string) => toCanonicalGrade(g))
            .filter(Boolean);
          if (canon.length) {
            conditions.push(inArray(schema.users.gradeLevel, canon as any));
          }
        }
      }

      const students = await db
        .select()
        .from(schema.users)
        .where(and(...conditions))
        .orderBy(asc(schema.users.lastName));

      return res.status(200).json({ students });
    } catch (error) {
      console.error("Error fetching students:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // LIST PENDING STUDENTS (admin only)
  // =========================
  app.get("/api/students/pending", authenticate, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const pendingStudents = await storage.getPendingStudents();
      return res.status(200).json({ students: pendingStudents });
    } catch (error) {
      console.error("Error fetching pending students:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // APPROVE STUDENT (admin only)
  // =========================
  app.post("/api/students/:id/approve", authenticate, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const studentId = parseNumericId(req.params.id);
      if (!studentId) return res.status(400).json({ message: "Invalid student id" });

      const student = await db.query.users.findFirst({
        where: and(eq(schema.users.id, studentId), eq(schema.users.role, "student")),
        columns: { id: true, approvalStatus: true },
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      if (student.approvalStatus === "approved") {
        return res.status(200).json({ message: "Already approved", student });
      }

      const [approvedStudent] = await db
        .update(schema.users)
        .set({
          approvalStatus: "approved",
          rejectionReason: null,
        })
        .where(and(eq(schema.users.id, studentId), eq(schema.users.role, "student")))
        .returning();

      return res.status(200).json({
        message: "Student account approved successfully",
        student: approvedStudent,
      });
    } catch (error) {
      console.error("Error approving student:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // REJECT STUDENT (admin only)
  // =========================
  app.post("/api/students/:id/reject", authenticate, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const studentId = parseNumericId(req.params.id);
      if (!studentId) return res.status(400).json({ message: "Invalid student id" });
      const { reason } = req.body;

      const student = await db.query.users.findFirst({
        where: and(
          eq(schema.users.id, studentId),
          eq(schema.users.role, "student"),
          eq(schema.users.approvalStatus, "pending"),
        ),
        columns: { id: true },
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found or not pending approval" });
      }

      const [rejectedStudent] = await db
        .update(schema.users)
        .set({
          approvalStatus: "rejected",
          rejectionReason: reason || "",
        })
        .where(and(eq(schema.users.id, studentId), eq(schema.users.role, "student")))
        .returning();

      return res.status(200).json({ message: "Student account rejected", student: rejectedStudent });
    } catch (error) {
      console.error("Error rejecting student:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  console.log("✅ Student routes registered");
}
