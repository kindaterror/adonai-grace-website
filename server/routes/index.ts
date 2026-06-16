/**
 * Modular Routes Index
 * 
 * Aggregates all modular route files for clean architecture.
 * This allows routes to be split into separate files while
 * maintaining a single entry point.
 * 
 * Usage: Import and call registerAllRoutes(app) in server/index.ts
 */

import { type Express } from "express";
import { registerAuthRoutes } from "./authRoutes";
import { registerUserRoutes } from "./userRoutes";
import { registerBookRoutes } from "./bookRoutes";
import { registerBadgeRoutes } from "./badgeRoutes";
import { registerStudentRoutes } from "./studentRoutes";
import { registerTeacherRoutes } from "./teacherRoutes";
import { registerAdminRoutes } from "./adminRoutes";

/**
 * Register all modular routes with the Express app
 */
export function registerAllRoutes(app: Express) {
  console.log("📦 Registering modular routes...");
  
  // Authentication routes (must be registered first)
  registerAuthRoutes(app);
  
  // User management routes
  registerUserRoutes(app);
  
  // Book management routes
  registerBookRoutes(app);
  
  // Badge routes
  registerBadgeRoutes(app);
  
  // Student management routes
  registerStudentRoutes(app);
  
  // Teacher management routes
  registerTeacherRoutes(app);
  
  // Admin/system routes
  registerAdminRoutes(app);
  
  console.log("✅ All modular routes registered successfully");
}

// Re-export individual route registrars for flexibility
export { registerAuthRoutes } from "./authRoutes";
export { registerUserRoutes } from "./userRoutes";
export { registerBookRoutes } from "./bookRoutes";
export { registerBadgeRoutes } from "./badgeRoutes";
export { registerStudentRoutes } from "./studentRoutes";
export { registerTeacherRoutes } from "./teacherRoutes";
export { registerAdminRoutes } from "./adminRoutes";
