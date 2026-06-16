/**
 * Badge Routes
 * 
 * Handles: badge CRUD, earned badges, book-badge associations
 */

import { type Express, type Request, type Response } from "express";
import * as schema from "@shared/schema";
import { db } from "@db";
import { eq, and, or, like, desc } from "drizzle-orm";
import { authenticate, authorize } from "../utils/auth";

export function registerBadgeRoutes(app: Express) {
  // =========================
  // CREATE BADGE (admin/teacher)
  // =========================
  app.post("/api/badges", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const {
        name,
        description = "",
        iconUrl = null,
        iconPublicId = null,
        isGeneric = true,
        isActive = true,
      } = req.body || {};

      if (!name || String(name).trim().length < 2) {
        return res.status(400).json({ success: false, message: "Badge name is required (min 2 chars)" });
      }

      const [badge] = await db
        .insert(schema.badges)
        .values({
          name: String(name).trim(),
          description: String(description || ""),
          iconUrl: iconUrl || null,
          iconPublicId: iconPublicId || null,
          isGeneric: !!isGeneric,
          isActive: !!isActive,
          createdById: userId ?? null,
        })
        .returning();

      return res.status(201).json({ success: true, badge });
    } catch (err) {
      console.error("POST /api/badges error:", err);
      return res.status(500).json({ success: false, message: "Failed to create badge" });
    }
  });

  // =========================
  // LIST BADGES (any authenticated user)
  // =========================
  app.get("/api/badges", authenticate, async (req: Request, res: Response) => {
    try {
      const search = (req.query.search as string) || "";
      const active = (req.query.active as string) || "";

      const where: any[] = [];
      if (search.trim()) {
        where.push(
          or(
            like(schema.badges.name, `%${search}%`),
            like(schema.badges.description, `%${search}%`)
          )
        );
      }
      if (active === "true") where.push(eq(schema.badges.isActive, true));
      if (active === "false") where.push(eq(schema.badges.isActive, false));

      const badges = await db.query.badges.findMany({
        where: where.length ? (and as any)(...where) : undefined,
        orderBy: [desc(schema.badges.createdAt)],
      });

      return res.status(200).json({ success: true, badges });
    } catch (err) {
      console.error("GET /api/badges error:", err);
      return res.status(500).json({ success: false, message: "Failed to list badges" });
    }
  });

  // =========================
  // UPDATE BADGE (admin/teacher)
  // =========================
  app.patch("/api/badges/:id", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid badge id" });

      const exists = await db.query.badges.findFirst({ where: eq(schema.badges.id, id) });
      if (!exists) return res.status(404).json({ success: false, message: "Badge not found" });

      const { name, description, iconUrl, iconPublicId, isGeneric, isActive } = req.body || {};
      const update: any = {};
      if (name !== undefined) update.name = String(name);
      if (description !== undefined) update.description = String(description);
      if (iconUrl !== undefined) update.iconUrl = iconUrl || null;
      if (iconPublicId !== undefined) update.iconPublicId = iconPublicId || null;
      if (isGeneric !== undefined) update.isGeneric = !!isGeneric;
      if (isActive !== undefined) update.isActive = !!isActive;

      const [updated] = await db.update(schema.badges).set(update).where(eq(schema.badges.id, id)).returning();
      return res.status(200).json({ success: true, badge: updated });
    } catch (err) {
      console.error("PATCH /api/badges/:id error:", err);
      return res.status(500).json({ success: false, message: "Failed to update badge" });
    }
  });

  // =========================
  // DELETE BADGE (admin only)
  // =========================
  app.delete("/api/badges/:id", authenticate, authorize(["admin"]), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid badge id" });

      const exists = await db.query.badges.findFirst({ where: eq(schema.badges.id, id) });
      if (!exists) return res.status(404).json({ success: false, message: "Badge not found" });

      await db.delete(schema.bookBadges).where(eq(schema.bookBadges.badgeId, id));
      await db.delete(schema.earnedBadges).where(eq(schema.earnedBadges.badgeId, id));
      await db.delete(schema.badges).where(eq(schema.badges.id, id));

      return res.status(200).json({ success: true, message: "Badge deleted" });
    } catch (err) {
      console.error("DELETE /api/badges/:id error:", err);
      return res.status(500).json({ success: false, message: "Failed to delete badge" });
    }
  });

  // =========================
  // ATTACH BADGE TO BOOK (admin/teacher)
  // =========================
  app.post("/api/books/:bookId/badges", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const { badgeId } = req.body;

      if (!badgeId) return res.status(400).json({ success: false, message: "badgeId is required" });

      const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!book) return res.status(404).json({ success: false, message: "Book not found" });

      const badge = await db.query.badges.findFirst({ where: eq(schema.badges.id, badgeId) });
      if (!badge) return res.status(404).json({ success: false, message: "Badge not found" });

      const existing = await db.query.bookBadges.findFirst({
        where: and(eq(schema.bookBadges.bookId, bookId), eq(schema.bookBadges.badgeId, badgeId)),
      });
      if (existing) return res.status(400).json({ success: false, message: "Badge already attached to this book" });

      const [bookBadge] = await db.insert(schema.bookBadges).values({ bookId, badgeId }).returning();
      return res.status(201).json({ success: true, bookBadge });
    } catch (err) {
      console.error("POST /api/books/:bookId/badges error:", err);
      return res.status(500).json({ success: false, message: "Failed to attach badge" });
    }
  });

  // =========================
  // LIST BADGES FOR A BOOK
  // =========================
  app.get("/api/books/:bookId/badges", authenticate, authorize(["admin", "teacher", "student"]), async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.bookId);

      const bookBadges = await db.query.bookBadges.findMany({
        where: eq(schema.bookBadges.bookId, bookId),
        with: { badge: true },
      });

      const badges = bookBadges.map((bb) => bb.badge).filter(Boolean);
      return res.status(200).json({ success: true, badges });
    } catch (err) {
      console.error("GET /api/books/:bookId/badges error:", err);
      return res.status(500).json({ success: false, message: "Failed to list book badges" });
    }
  });

  // =========================
  // REMOVE BADGE FROM BOOK
  // =========================
  app.delete("/api/books/:bookId/badges/:bookBadgeId", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const bookBadgeId = parseInt(req.params.bookBadgeId);

      const exists = await db.query.bookBadges.findFirst({ where: eq(schema.bookBadges.id, bookBadgeId) });
      if (!exists) return res.status(404).json({ success: false, message: "Book badge not found" });

      await db.delete(schema.bookBadges).where(eq(schema.bookBadges.id, bookBadgeId));
      return res.status(200).json({ success: true, message: "Badge removed from book" });
    } catch (err) {
      console.error("DELETE /api/books/:bookId/badges/:bookBadgeId error:", err);
      return res.status(500).json({ success: false, message: "Failed to remove badge" });
    }
  });

  // =========================
  // LIST EARNED BADGES FOR USER
  // =========================
  app.get("/api/users/:userId/badges", authenticate, async (req: Request, res: Response) => {
    try {
      const requester = (req as any).user as { id: number; role: "student" | "teacher" | "admin" };
      const userId = parseInt(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ success: false, message: "Invalid user id" });

      if (requester.role === "student" && requester.id !== userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const earned = await db.query.earnedBadges.findMany({
        where: eq(schema.earnedBadges.userId, userId),
        with: { badge: true, book: { columns: { id: true, title: true } } },
        orderBy: [desc(schema.earnedBadges.createdAt)],
      });

      const formatted = earned.map((eb) => ({
        id: eb.id,
        userId: eb.userId,
        badgeId: eb.badgeId,
        bookId: eb.bookId,
        awardedAt: eb.awardedAt ?? null,
        createdAt: eb.createdAt ?? null,
        note: eb.note,
        badge: eb.badge
          ? {
              id: eb.badge.id,
              name: eb.badge.name,
              description: eb.badge.description,
              iconUrl: eb.badge.iconUrl ?? null,
              iconPublicId: eb.badge.iconPublicId ?? null,
            }
          : null,
        book: eb.book || null,
      }));

      return res.status(200).json({ success: true, earnedBadges: formatted });
    } catch (err) {
      console.error("GET /api/users/:userId/badges error:", err);
      return res.status(500).json({ success: false, message: "Failed to list earned badges" });
    }
  });

  // =========================
  // AWARD BADGE TO USER (admin/teacher)
  // =========================
  app.post("/api/users/:userId/badges", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ success: false, message: "Invalid user id" });

      const { badgeId, bookId = null, note = null } = req.body;
      if (!badgeId) return res.status(400).json({ success: false, message: "badgeId is required" });

      const badge = await db.query.badges.findFirst({ where: eq(schema.badges.id, badgeId) });
      if (!badge) return res.status(404).json({ success: false, message: "Badge not found" });

      const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const [earnedBadge] = await db.insert(schema.earnedBadges).values({
        userId,
        badgeId,
        bookId: bookId || null,
        note: note || null,
        awardedAt: new Date(),
      }).returning();

      return res.status(201).json({ success: true, earnedBadge });
    } catch (err) {
      console.error("POST /api/users/:userId/badges error:", err);
      return res.status(500).json({ success: false, message: "Failed to award badge" });
    }
  });

  console.log("✅ Badge routes registered");
}
