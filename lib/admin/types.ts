/**
 * Standardized result type for admin server actions
 */
export type AdminActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Pagination parameters for list operations
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
};

/**
 * Paginated response type
 */
export type PaginationResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Filters for tenant list queries
 */
export type TenantFilters = {
  status?: "active" | "suspended" | "archived" | "trial";
  search?: string;
};

/**
 * Filters for user list queries
 */
export type UserFilters = {
  role?: "teacher" | "student" | "platform_admin";
  status?: "active" | "suspended" | "deleted" | "pending_verification";
  tenantId?: string;
  search?: string;
};

/**
 * Filters for audit log queries
 */
export type AuditLogFilters = {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
};

/**
 * Tenant invite lifecycle typing
 */
export type TenantInviteStatus = "pending" | "claimed" | "revoked" | "expired";

export type TenantInviteRecord = {
  id: string;
  email: string;
  token_hash: string;
  status: TenantInviteStatus;
  metadata: Record<string, unknown>;
  expires_at: string;
  issued_by: string;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};
