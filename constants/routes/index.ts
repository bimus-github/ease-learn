/**
 * Central export for all route constants
 * Import from here for convenience: import { teacherRoutes, authRoutes } from '@/constants/routes'
 */
export * from "./auth";
export * from "./teacher";
export * from "./students";
export * from "./admin";

/**
 * Public routes that don't require authentication
 */
export const publicRoutes = {
  /** Public homepage */
  home: "/",
} as const;
