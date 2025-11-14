/**
 * Student routes
 * Tenant-based routes for student access via Telegram authentication
 */

/**
 * Generate student dashboard route for a tenant
 * @param tenantSlug - The tenant subdomain slug
 * @returns Route path like "/teachername"
 */
export function getStudentDashboardRoute(tenantSlug: string): string {
  return `/${tenantSlug}`;
}

/**
 * Generate student course route for a tenant
 * @param tenantSlug - The tenant subdomain slug
 * @param courseId - The course ID
 * @returns Route path like "/teachername/courses/course-id"
 */
export function getStudentCourseRoute(
  tenantSlug: string,
  courseId: string
): string {
  return `/${tenantSlug}/courses/${courseId}`;
}

/**
 * Generate student lesson route for a tenant
 * @param tenantSlug - The tenant subdomain slug
 * @param courseId - The course ID
 * @param lessonId - The lesson ID
 * @returns Route path like "/teachername/courses/course-id/lessons/lesson-id"
 */
export function getStudentLessonRoute(
  tenantSlug: string,
  courseId: string,
  lessonId: string
): string {
  return `/${tenantSlug}/courses/${courseId}/lessons/${lessonId}`;
}
