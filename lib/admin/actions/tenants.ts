"use server";

import { requireSuperAdminAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/auth/audit";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  suspendTenantSchema,
  reactivateTenantSchema,
  createTenantSchema,
  updateTenantSchema,
} from "@/lib/schemas/admin";
import {
  getAllTenantsQuery,
  getTenantByIdQuery,
} from "@/lib/admin/utils/database";
import type {
  AdminActionResult,
  PaginationParams,
  PaginationResponse,
  TenantFilters,
  TenantInviteRecord,
} from "@/lib/admin/types";
import { TENANT_INVITES_TABLE } from "@/constants/tables";
import { createHash } from "crypto";

/**
 * Get all tenants with optional filters and pagination
 */
export async function getAllTenants(
  filters?: TenantFilters,
  pagination?: PaginationParams
): Promise<AdminActionResult<PaginationResponse<unknown>>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await getAllTenantsQuery(filters, pagination);
    return { success: true, data: result };
  } catch (error) {
    console.error("[admin] Error fetching tenants", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tenants",
    };
  }
}

/**
 * Get a single tenant by ID
 */
export async function getTenantById(
  tenantId: string
): Promise<AdminActionResult<unknown>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    if (!tenantId) {
      return { success: false, error: "Tenant ID is required" };
    }

    const tenant = await getTenantByIdQuery(tenantId);
    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    return { success: true, data: tenant };
  } catch (error) {
    console.error("[admin] Error fetching tenant", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tenant",
    };
  }
}

/**
 * Suspend a tenant
 */
export async function suspendTenant(
  tenantId: string,
  reason?: string
): Promise<AdminActionResult<{ tenantId: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = suspendTenantSchema.safeParse({ tenantId, reason });
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Check if tenant exists
    const existingTenant = await getTenantByIdQuery(tenantId);
    if (!existingTenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Update tenant status
    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        status: "suspended",
        suspended_at: new Date().toISOString(),
        suspended_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to suspend tenant: ${updateError.message}`,
      };
    }

    // Log action
    await logAdminAction({
      actorId: authResult.user.id,
      action: "tenant_suspended",
      resourceType: "tenant",
      resourceId: tenantId,
      payload: { reason: reason || null },
      supabase,
    });

    return { success: true, data: { tenantId } };
  } catch (error) {
    console.error("[admin] Error suspending tenant", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to suspend tenant",
    };
  }
}

/**
 * Reactivate a tenant
 */
export async function reactivateTenant(
  tenantId: string
): Promise<AdminActionResult<{ tenantId: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = reactivateTenantSchema.safeParse({ tenantId });
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Check if tenant exists
    const existingTenant = await getTenantByIdQuery(tenantId);
    if (!existingTenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Update tenant status
    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        status: "active",
        suspended_at: null,
        suspended_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to reactivate tenant: ${updateError.message}`,
      };
    }

    // Log action
    await logAdminAction({
      actorId: authResult.user.id,
      action: "tenant_reactivated",
      resourceType: "tenant",
      resourceId: tenantId,
      supabase,
    });

    return { success: true, data: { tenantId } };
  } catch (error) {
    console.error("[admin] Error reactivating tenant", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reactivate tenant",
    };
  }
}

/**
 * Create a new tenant
 */
export async function createTenant(
  data: {
    subdomain: string;
    teacher_owner_id: string;
    status?: string;
    branding?: unknown;
    plan_type?: string;
  }
): Promise<AdminActionResult<{ tenantId: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = createTenantSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Insert new tenant
    const { data: newTenant, error: insertError } = await supabase
      .from("tenants")
      .insert({
        subdomain: validation.data.subdomain,
        teacher_owner_id: validation.data.teacher_owner_id,
        status: validation.data.status || "active",
        branding: validation.data.branding || {},
        plan_type: validation.data.plan_type || "free",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !newTenant) {
      return {
        success: false,
        error: `Failed to create tenant: ${insertError?.message || "Unknown error"}`,
      };
    }

    // Log action
    await logAdminAction({
      actorId: authResult.user.id,
      action: "tenant_created",
      resourceType: "tenant",
      resourceId: newTenant.id,
      payload: { ...validation.data },
      supabase,
    });

    return { success: true, data: { tenantId: newTenant.id } };
  } catch (error) {
    console.error("[admin] Error creating tenant", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create tenant",
    };
  }
}

/**
 * Update a tenant
 */
export async function updateTenant(
  tenantId: string,
  data: {
    subdomain?: string;
    custom_domain?: string | null;
    status?: string;
    branding?: unknown;
    plan_type?: string;
    billing_email?: string | null;
    max_students?: number | null;
    max_courses?: number | null;
    max_storage_gb?: number | null;
    admin_notes?: string | null;
  }
): Promise<AdminActionResult<{ tenantId: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = updateTenantSchema.safeParse({ tenantId, ...data });
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Check if tenant exists
    const existingTenant = await getTenantByIdQuery(tenantId);
    if (!existingTenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Build update object (exclude tenantId from update)
    const { tenantId: _, ...updateData } = validation.data;
    const updates: Record<string, unknown> = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    // Update tenant
    const { error: updateError } = await supabase
      .from("tenants")
      .update(updates)
      .eq("id", tenantId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update tenant: ${updateError.message}`,
      };
    }

    // Log action
    await logAdminAction({
      actorId: authResult.user.id,
      action: "tenant_updated",
      resourceType: "tenant",
      resourceId: tenantId,
      payload: { ...updates },
      supabase,
    });

    return { success: true, data: { tenantId } };
  } catch (error) {
    console.error("[admin] Error updating tenant", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update tenant",
    };
  }
}

export type TenantInviteValidationError =
  | "not_found"
  | "revoked"
  | "claimed"
  | "expired";

export type TenantInviteValidationResult =
  | { success: true; invite: TenantInviteRecord }
  | { success: false; error: TenantInviteValidationError };

/**
 * Shared helper to validate tenant invite tokens.
 */
export async function getValidTenantInvite(
  token: string,
): Promise<TenantInviteValidationResult> {
  if (!token) {
    return { success: false, error: "not_found" };
  }

  try {
    const supabase = getServiceRoleSupabaseClient();
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const { data: invite, error } = await supabase
      .from(TENANT_INVITES_TABLE)
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !invite) {
      return { success: false, error: "not_found" };
    }

    const now = new Date();
    const expired =
      invite.expires_at && new Date(invite.expires_at).getTime() < now.getTime();

    if (expired && invite.status === "pending") {
      await supabase
        .from(TENANT_INVITES_TABLE)
        .update({ status: "expired" })
        .eq("id", invite.id);
      invite.status = "expired";
    }

    if (invite.status === "revoked") {
      return { success: false, error: "revoked" };
    }

    if (invite.status === "claimed") {
      return { success: false, error: "claimed" };
    }

    if (invite.status === "expired" || expired) {
      return { success: false, error: "expired" };
    }

    return { success: true, invite: invite as TenantInviteRecord };
  } catch (error) {
    console.error("[admin] Failed to validate tenant invite token", error);
    return { success: false, error: "not_found" };
  }
}

