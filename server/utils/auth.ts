/**
 * Authentication Middleware
 * 
 * Shared authentication and authorization middleware for all route modules
 */

import { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import * as schema from "@shared/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { JWT_SECRET } from "../routes/jwtConfig";

// ---------------------------------------------------------------------
// AUTHENTICATE - Verify JWT token
// ---------------------------------------------------------------------
export const authenticate = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a valid Bearer token.",
    });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication token is missing." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    // fetch user and enforce passwordChangedAt
    const userId = decoded.id as number | undefined;
    if (!userId) return res.status(401).json({ success: false, message: "Invalid token payload." });

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { id: true, role: true, email: true, passwordChangedAt: true },
    });
    if (!user) return res.status(401).json({ success: false, message: "User not found." });

    if (user.passwordChangedAt && decoded.iat) {
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      if (tokenIssuedAt < new Date(user.passwordChangedAt)) {
        return res.status(401).json({
          success: false,
          message: "Token is no longer valid. Please log in again.",
        });
      }
    }

    (req as any).user = { id: user.id, role: user.role, email: user.email };
    return next();
  } catch (error) {
    let message = "Invalid or expired token";
    if (error instanceof jwt.TokenExpiredError) message = "Token has expired. Please log in again.";
    else if (error instanceof jwt.JsonWebTokenError) message = "Invalid token format.";
    return res.status(401).json({ success: false, message });
  }
};

// ---------------------------------------------------------------------
// AUTHORIZE - Check user role
// ---------------------------------------------------------------------
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ success: false, message: "Authentication required" });
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

// ---------------------------------------------------------------------
// REQUIRE ADMIN - Simple admin check
// ---------------------------------------------------------------------
export const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};
