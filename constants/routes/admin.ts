/**
 * Platform admin routes
 * For platform operators managing tenants, users, and system configuration
 * These routes are for future implementation
 */
export const adminRoutes = {
  /** Base admin portal route */
  base: "/admin",
  /** Admin dashboard */
  dashboard: "/admin/dashboard",
  /** Tenant management */
  tenants: "/admin/tenants",
  /** User management */
  users: "/admin/users",
  /** System settings */
  settings: "/admin/settings",
} as const;
