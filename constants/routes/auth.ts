/**
 * Authentication-related routes
 * Used for Supabase auth callbacks and error handling
 */
export const authRoutes = {
  /** Email confirmation callback from Supabase */
  confirm: "/auth/confirm",
  /** Auth error page */
  error: "/auth/error",
} as const;
