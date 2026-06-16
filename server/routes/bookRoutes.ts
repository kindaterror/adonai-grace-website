/**
 * Book Routes
 * 
 * Handles: book CRUD, chapters, teacher-specific listings
 */

import { type Express, type Request, type Response } from "express";
import * as schema from "@shared/schema";
import { db } from "@db";
import { eq, and, or, like, inArray, desc, asc } from "drizzle-orm";
import { ZodError } from "zod";
import { BookCreateApiSchema } from "@shared/bookCreateApiSchema";
import { authenticate, authorize } from "../utils/auth";
import { toCanonicalGrade, toLabelGrade, isStorybookSubject, normSubject } from "../utils/helpers";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export function registerBookRoutes(app: Express) {
  // =========================
  // LIST ALL BOOKS
  // =========================
  app.get("/api/books", authenticate, authorize(["admin", "teacher", "student"]), async (req: Request, res: Response) => {
    try {
      const type = req.query.type as string;
      const search = req.query.search as string;
      const grade = req.query.grade as string;
      const subject = req.query.subject as string;

      let query = db.select().from(schema.books);
      const conditions: any[] = [];

      if (type && type !== "all") conditions.push(eq(schema.books.type, type as any));
      if (grade && grade !== "all") conditions.push(eq(schema.books.grade, grade));
      if (subject && subject !== "all") conditions.push(eq(schema.books.subject, subject));
      if (search) {
        conditions.push(
          or(
            like(schema.books.title, `%${search}%`),
            like(schema.books.description, `%${search}%`),
            like(schema.books.subject, `%${search}%`)
          )
        );
      }
      if (conditions.length > 0) query = (query.where(and(...conditions)) as typeof query) || query;

      const books = await query.orderBy(desc(schema.books.createdAt));
      return res.status(200).json({ books });
    } catch (error) {
      console.error("Error fetching books:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // GET SINGLE BOOK BY ID
  // =========================
  app.get("/api/books/:id", authenticate, authorize(["admin", "teacher", "student"]), async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId),
        with: { chapters: { orderBy: asc(schema.chapters.orderIndex) } },
      });
      if (!book) return res.status(404).json({ message: "Book not found" });
      return res.status(200).json({ book });
    } catch (error) {
      console.error("Error fetching book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // DELETE BOOK
  // =========================
  app.delete("/api/books/:id", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!book) return res.status(404).json({ message: "Book not found" });

      const pages = await db.query.pages.findMany({
        where: eq(schema.pages.bookId, bookId),
        with: { questions: true },
      });

      await db.transaction(async (tx) => {
        await tx.delete(schema.readingSessions).where(eq(schema.readingSessions.bookId, bookId));
        for (const page of pages) {
          if (page.questions?.length) {
            await tx.delete(schema.questions).where(inArray(schema.questions.id, page.questions.map((q) => q.id)));
          }
        }
        if (pages.length) await tx.delete(schema.pages).where(eq(schema.pages.bookId, bookId));
        await tx.delete(schema.progress).where(eq(schema.progress.bookId, bookId));
        await tx.delete(schema.books).where(eq(schema.books.id, bookId));
      });

      return res.status(200).json({ message: "Book deleted successfully", id: bookId });
    } catch (error) {
      console.error("Error deleting book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // UPDATE BOOK
  // =========================
  app.put("/api/books/:id", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.id);
      const { title, description, type, grade, subject, coverImage, coverPublicId, musicUrl, quizMode } = req.body;

      if (!title || !description || !type) {
        return res.status(400).json({
          message: "Validation error",
          errors: "Title, description, and type are required",
        });
      }
      if (type === "educational" && (!subject || !String(subject).trim())) {
        return res.status(400).json({ message: "Subject is required for educational books" });
      }

      const safeQuizMode: "retry" | "straight" = quizMode === "straight" ? "straight" : "retry";
      const update = {
        title: String(title).trim(),
        description: String(description).trim(),
        type,
        grade: grade?.trim() || null,
        subject: type === "educational" ? String(subject).trim() : null,
        coverImage: coverImage?.trim() || null,
        coverPublicId: coverPublicId?.trim() || null,
        musicUrl: musicUrl?.trim() || null,
        quizMode: safeQuizMode,
      };

      const exists = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!exists) return res.status(404).json({ message: "Book not found" });

      const [updatedBook] = await db.update(schema.books).set(update).where(eq(schema.books.id, bookId)).returning();
      return res.status(200).json({ message: "Book updated successfully", book: updatedBook });
    } catch (error) {
      console.error("Error in edit book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // CREATE BOOK
  // =========================
  app.post("/api/books", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const parsed = BookCreateApiSchema.parse(req.body);

      const title = parsed.title.trim();
      const description = parsed.description.trim();
      const type = parsed.type;

      const subject = type === "educational" ? (parsed.subject?.trim() || null) : null;
      const grade = parsed.grade?.trim() || null;
      const coverImage = parsed.coverImage?.trim() || null;
      const coverPublicId = coverImage ? (parsed.coverPublicId?.trim() || null) : null;
      const musicUrl = parsed.musicUrl?.trim() || null;
      const quizMode: "retry" | "straight" = parsed.quizMode === "straight" ? "straight" : "retry";

      if (type === "educational" && !subject) {
        return res.status(400).json({ message: "Subject is required for educational books" });
      }

      const userId = (req as any).user?.id ?? null;

      // slugify title
      const slug = slugify(title);

      const [newBook] = await db.insert(schema.books).values({
        slug,
        title,
        description,
        type,
        subject,
        grade,
        coverImage,
        coverPublicId,
        musicUrl,
        quizMode,
        addedById: userId,
      }).returning();

      return res.status(201).json({ message: "Book added successfully", book: newBook });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error?.code === "23505" && error?.constraint?.includes("uniq_title_grade_subject")) {
        return res.status(400).json({
          message: "A book with the same title, grade, and subject already exists.",
        });
      }
      console.error("Error adding book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // ADD CHAPTER TO BOOK
  // =========================
  app.post("/api/books/:bookId/chapters", authenticate, authorize(["admin", "teacher"]), async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.bookId, 10);
      const chapterData = schema.insertChapterSchema.parse(req.body);

      const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!book) return res.status(404).json({ message: "Book not found" });

      const chapters = await db.query.chapters.findMany({
        where: eq(schema.chapters.bookId, bookId),
        orderBy: desc(schema.chapters.orderIndex),
        limit: 1,
      });
      const orderIndex = chapters.length > 0 ? chapters[0].orderIndex + 1 : 0;

      const [newChapter] = await db.insert(schema.chapters)
        .values({ ...chapterData, bookId, orderIndex })
        .returning();

      return res.status(201).json({ message: "Chapter added successfully", chapter: newChapter });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding chapter:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // TEACHER BOOK LISTING (filtered by settings)
  // =========================
  app.get("/api/teacher/books", authenticate, authorize(["teacher"]), async (req: Request, res: Response) => {
    try {
      const type = (req.query.type as string) || "";
      const search = (req.query.search as string) || "";
      const gradeQ = (req.query.grade as string) || "all";
      const subjectQ = (req.query.subject as string) || "all";
      const userId = (req as any).user?.id;

      // Load teacher settings
      const teacherSettings = await db
        .select()
        .from(schema.teachingSettings)
        .where(eq(schema.teachingSettings.userId, userId))
        .limit(1);

      let query = db.select().from(schema.books);
      const conditions: any[] = [];

      // ---------- Settings: grades ----------
      if (
        teacherSettings.length > 0 &&
        Array.isArray(teacherSettings[0].preferredGrades) &&
        teacherSettings[0].preferredGrades.length
      ) {
        const canon = teacherSettings[0].preferredGrades
          .map(toCanonicalGrade)
          .filter(Boolean) as string[];
        if (canon.length) {
          const gradeConds = canon.map((g: string) => eq(schema.books.grade, g));
          conditions.push(or(...gradeConds));
        }
      }

      // ---------- Settings: subjects ----------
      if (
        teacherSettings.length > 0 &&
        Array.isArray(teacherSettings[0].subjects) &&
        teacherSettings[0].subjects.length
      ) {
        const wantedRaw = teacherSettings[0].subjects
          .map((s: string) => s?.trim())
          .filter(Boolean);

        const hasStorybook = wantedRaw.some(isStorybookSubject);
        const eduWanted = wantedRaw.filter((s) => !isStorybookSubject(s));

        // Build the OR(...) for educational subjects
        const eduOr =
          eduWanted.length > 0
            ? or(
                ...eduWanted.flatMap((label: string) => {
                  const kebab = normSubject(label);
                  return [
                    eq(schema.books.subject, label),
                    eq(schema.books.subject, kebab),
                    like(schema.books.subject, `%${label}%`),
                    like(schema.books.subject, `%${kebab}%`),
                  ];
                })
              )
            : null;

        if (hasStorybook && eduOr) {
          conditions.push(or(eq(schema.books.type, "storybook"), eduOr));
        } else if (hasStorybook) {
          conditions.push(eq(schema.books.type, "storybook"));
        } else if (eduOr) {
          conditions.push(eduOr);
        }
      }

      // ---------- Explicit filters ----------
      const subjectIsStory = isStorybookSubject(subjectQ);

      if (gradeQ && gradeQ !== "all") {
        const g = toCanonicalGrade(gradeQ);
        if (g) conditions.push(eq(schema.books.grade, g));
      }

      if (subjectQ && subjectQ !== "all") {
        const sLabel = String(subjectQ).trim();
        const sKebab = normSubject(sLabel);
        // educational subjects imply educational type
        if (subjectIsStory) {
          if (type === "educational") {
            conditions.push(or(eq(schema.books.type, "storybook"), eq(schema.books.subject, sLabel), eq(schema.books.subject, sKebab)));
          } else {
            conditions.push(or(eq(schema.books.type, "storybook"), like(schema.books.subject, `%${sLabel}%`), like(schema.books.subject, `%${sKebab}%`)));
          }
        } else {
          if (type && type !== "all") conditions.push(eq(schema.books.type, type as any));
          conditions.push(or(eq(schema.books.subject, sLabel), eq(schema.books.subject, sKebab), like(schema.books.subject, `%${sLabel}%`), like(schema.books.subject, `%${sKebab}%`)));
        }
      } else if (type && type !== "all") {
        // @ts-ignore - Drizzle enum type mismatch with query string
        conditions.push(eq(schema.books.type, type as any));
      }

      if (search) {
        conditions.push(
          or(
            like(schema.books.title, `%${search}%`),
            like(schema.books.description, `%${search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = (query.where(and(...conditions)) as typeof query) || query;
      }

      const books = await query.orderBy(desc(schema.books.createdAt));
      return res.status(200).json({ books });
    } catch (error) {
      console.error("Error fetching teacher books:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // GET TEACHER BOOK BY ID
  // =========================
  app.get("/api/teacher/books/:id", authenticate, authorize(["teacher"]), async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId),
        with: { chapters: { orderBy: asc(schema.chapters.orderIndex) } },
      });
      if (!book) return res.status(404).json({ message: "Book not found" });
      return res.status(200).json({ book });
    } catch (error) {
      console.error("Error fetching teacher book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // CREATE TEACHER BOOK
  // =========================
  app.post("/api/teacher/books", authenticate, authorize(["teacher"]), async (req: Request, res: Response) => {
    try {
      const parsed = BookCreateApiSchema.parse(req.body);

      const title = parsed.title.trim();
      const description = parsed.description.trim();
      const type = parsed.type;
      const subject = type === "educational" ? (parsed.subject?.trim() || null) : null;
      const grade = parsed.grade?.trim() || null;
      const coverImage = parsed.coverImage?.trim() || null;
      const coverPublicId = coverImage ? (parsed.coverPublicId?.trim() || null) : null;
      const musicUrl = parsed.musicUrl?.trim() || null;
      const quizMode: "retry" | "straight" = parsed.quizMode === "straight" ? "straight" : "retry";

      if (type === "educational" && !subject) {
        return res.status(400).json({ message: "Subject is required for educational books" });
      }

      const userId = (req as any).user?.id ?? null;
      const slug = slugify(title);

      const [newBook] = await db.insert(schema.books).values({
        slug,
        title,
        description,
        type,
        subject,
        grade,
        coverImage,
        coverPublicId,
        musicUrl,
        quizMode,
        addedById: userId,
      }).returning();

      return res.status(201).json({ message: "Book added successfully", book: newBook });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error?.code === "23505" && error?.constraint?.includes("uniq_title_grade_subject")) {
        return res.status(400).json({
          message: "A book with the same title, grade, and subject already exists.",
        });
      }
      console.error("Error adding teacher book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // UPDATE TEACHER BOOK
  // =========================
  app.put("/api/teacher/books/:id", authenticate, authorize(["teacher"]), async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.id);
      const { title, description, type, grade, subject, coverImage, coverPublicId, musicUrl, quizMode } = req.body;

      if (!title || !description || !type) {
        return res.status(400).json({
          message: "Validation error",
          errors: "Title, description, and type are required",
        });
      }
      if (type === "educational" && (!subject || !String(subject).trim())) {
        return res.status(400).json({ message: "Subject is required for educational books" });
      }

      const safeQuizMode: "retry" | "straight" = quizMode === "straight" ? "straight" : "retry";
      const update = {
        title: String(title).trim(),
        description: String(description).trim(),
        type,
        grade: grade?.trim() || null,
        subject: type === "educational" ? String(subject).trim() : null,
        coverImage: coverImage?.trim() || null,
        coverPublicId: coverPublicId?.trim() || null,
        musicUrl: musicUrl?.trim() || null,
        quizMode: safeQuizMode,
      };

      const exists = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!exists) return res.status(404).json({ message: "Book not found" });

      const [updatedBook] = await db.update(schema.books).set(update).where(eq(schema.books.id, bookId)).returning();
      return res.status(200).json({ message: "Book updated successfully", book: updatedBook });
    } catch (error) {
      console.error("Error updating teacher book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // =========================
  // DELETE TEACHER BOOK
  // =========================
  app.delete("/api/teacher/books/:id", authenticate, authorize(["teacher"]), async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await db.query.books.findFirst({ where: eq(schema.books.id, bookId) });
      if (!book) return res.status(404).json({ message: "Book not found" });

      const pages = await db.query.pages.findMany({
        where: eq(schema.pages.bookId, bookId),
        with: { questions: true },
      });

      await db.transaction(async (tx) => {
        await tx.delete(schema.readingSessions).where(eq(schema.readingSessions.bookId, bookId));
        for (const page of pages) {
          if (page.questions?.length) {
            await tx.delete(schema.questions).where(inArray(schema.questions.id, page.questions.map((q) => q.id)));
          }
        }
        if (pages.length) await tx.delete(schema.pages).where(eq(schema.pages.bookId, bookId));
        await tx.delete(schema.progress).where(eq(schema.progress.bookId, bookId));
        await tx.delete(schema.books).where(eq(schema.books.id, bookId));
      });

      return res.status(200).json({ message: "Book deleted successfully", id: bookId });
    } catch (error) {
      console.error("Error deleting teacher book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  console.log("✅ Book routes registered");
}
