/**
 * Teacher admin portal routes
 * All routes under /teachers/* for teacher authentication and management
 */
export const teacherRoutes = {
  /** Base teacher portal route */
  base: "/teachers",
  /** Teacher login page */
  login: "/teachers/login",
  /** Teacher dashboard */
  dashboard: "/teachers/dashboard",
  /** Forgot password page */
  forgotPassword: "/teachers/forgot-password",
  /** Update password page (from email reset link) */
  updatePassword: "/teachers/update-password",
  /** Teacher invite acceptance page */
  invite: "/teachers/invite",
} as const;

/**
 * Public teacher routes that don't require authentication
 */
export const publicTeacherRoutes = [
  teacherRoutes.login,
  teacherRoutes.forgotPassword,
  teacherRoutes.invite,
] as const;

