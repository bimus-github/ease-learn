"use server";

import { requireSuperAdminAuth } from "@/lib/auth";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { auditLogFiltersSchema } from "@/lib/schemas/admin";
import type {
  AdminActionResult,
  PaginationParams,
  PaginationResponse,
  AuditLogFilters,
} from "@/lib/admin/types";

/**
 * Internal helper to build pagination parameters
 */
function buildPagination(pagination?: PaginationParams) {
  const page = Math.max(1, pagination?.page ?? 1);
  const limit = Math.min(1000, Math.max(1, pagination?.limit ?? 50));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Get audit logs with optional filters and pagination
 */
export async function getAuditLogs(
  filters?: AuditLogFilters,
  pagination?: PaginationParams
): Promise<AdminActionResult<PaginationResponse<unknown>>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate filters
    if (filters) {
      const validation = auditLogFiltersSchema.safeParse(filters);
      if (!validation.success) {
        return {
          success: false,
          error: `Validation failed: ${validation.error.message}`,
        };
      }
    }

    const supabase = getServiceRoleSupabaseClient();
    const { page, limit, offset } = buildPagination(pagination);

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.actorId) {
        query = query.eq("actor_id", filters.actorId);
      }

      if (filters.action) {
        query = query.eq("action", filters.action);
      }

      if (filters.resourceType) {
        query = query.eq("resource_type", filters.resourceType);
      }

      if (filters.resourceId) {
        query = query.eq("resource_id", filters.resourceId);
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: `Failed to fetch audit logs: ${error.message}`,
      };
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return {
      success: true,
      data: {
        items: data ?? [],
        total: count ?? 0,
        page,
        limit,
        totalPages,
      },
    };
  } catch (error) {
    console.error("[admin] Error fetching audit logs", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch audit logs",
    };
  }
}

/**
 * Export audit logs in CSV or JSON format
 */
export async function exportAuditLogs(
  filters?: AuditLogFilters,
  format: "csv" | "json" = "json"
): Promise<AdminActionResult<{ format: string; data: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate filters
    if (filters) {
      const validation = auditLogFiltersSchema.safeParse(filters);
      if (!validation.success) {
        return {
          success: false,
          error: `Validation failed: ${validation.error.message}`,
        };
      }
    }

    const supabase = getServiceRoleSupabaseClient();

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply filters (no pagination for exports)
    if (filters) {
      if (filters.actorId) {
        query = query.eq("actor_id", filters.actorId);
      }

      if (filters.action) {
        query = query.eq("action", filters.action);
      }

      if (filters.resourceType) {
        query = query.eq("resource_type", filters.resourceType);
      }

      if (filters.resourceId) {
        query = query.eq("resource_id", filters.resourceId);
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }
    }

    // Limit export to 10,000 records to prevent memory issues
    query = query.limit(10000);

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: `Failed to export audit logs: ${error.message}`,
      };
    }

    const logs = data ?? [];

    if (format === "csv") {
      // Convert to CSV
      if (logs.length === 0) {
        return {
          success: true,
          data: {
            format: "csv",
            data: "id,tenant_id,actor_id,action,resource_type,resource_id,payload,created_at\n",
          },
        };
      }

      // CSV headers
      const headers = [
        "id",
        "tenant_id",
        "actor_id",
        "action",
        "resource_type",
        "resource_id",
        "payload",
        "created_at",
      ];

      // CSV rows
      const rows = logs.map((log) => {
        const row = [
          log.id ?? "",
          log.tenant_id ?? "",
          log.actor_id ?? "",
          log.action ?? "",
          log.resource_type ?? "",
          log.resource_id ?? "",
          JSON.stringify(log.payload ?? {}),
          log.created_at ?? "",
        ];
        // Escape quotes and wrap in quotes if contains comma
        return row.map((cell) => {
          const str = String(cell);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
      });

      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
        "\n"
      );

      return {
        success: true,
        data: {
          format: "csv",
          data: csv,
        },
      };
    } else {
      // JSON format
      return {
        success: true,
        data: {
          format: "json",
          data: JSON.stringify(logs, null, 2),
        },
      };
    }
  } catch (error) {
    console.error("[admin] Error exporting audit logs", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to export audit logs",
    };
  }
}

