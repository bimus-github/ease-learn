"use server";

import { requireSuperAdminAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/auth/audit";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  suspendUserSchema,
  reactivateUserSchema,
  changeUserRoleSchema,
} from "@/lib/schemas/admin";
import { getAllUsersQuery, getUserByIdQuery } from "@/lib/admin/utils/database";
import type {
  AdminActionResult,
  PaginationParams,
  PaginationResponse,
  UserFilters,
} from "@/lib/admin/types";

/**
 * Get all users with optional filters and pagination
 */
export async function getAllUsers(
  filters?: UserFilters,
  pagination?: PaginationParams
): Promise<AdminActionResult<PaginationResponse<unknown>>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await getAllUsersQuery(filters, pagination);
    return { success: true, data: result };
  } catch (error) {
    console.error("[admin] Error fetching users", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch users",
    };
  }
}

/**
 * Get a single user by ID
 */
export async function getUserById(
  userId: string
): Promise<AdminActionResult<unknown>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    const user = await getUserByIdQuery(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, data: user };
  } catch (error) {
    console.error("[admin] Error fetching user", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user",
    };
  }
}

/**
 * Suspend a user
 */
export async function suspendUser(
  userId: string,
  reason?: string
): Promise<AdminActionResult<{ userId: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = suspendUserSchema.safeParse({ userId, reason });
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Check if user exists
    const existingUser = await getUserByIdQuery(userId);
    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Update user status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        status: "suspended",
        suspended_at: new Date().toISOString(),
        suspended_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to suspend user: ${updateError.message}`,
      };
    }

    // Optionally sign out user from all sessions using Admin API
    try {
      const { error: signOutError } = await supabase.auth.admin.signOut(
        userId,
        "global"
      );
      if (signOutError) {
        console.warn("[admin] Failed to sign out user from all sessions", signOutError);
      }
    } catch (err) {
      // Non-critical error - log but don't fail the operation
      console.warn("[admin] Error signing out user", err);
    }

    // Log action
    await logAdminAction({
      actorId: authResult.user.id,
      action: "user_suspended",
      resourceType: "user",
      resourceId: userId,
      payload: { reason: reason || null },
      supabase,
    });

    return { success: true, data: { userId } };
  } catch (error) {
    console.error("[admin] Error suspending user", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to suspend user",
    };
  }
}

/**
 * Reactivate a user
 */
export async function reactivateUser(
  userId: string
): Promise<AdminActionResult<{ userId: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = reactivateUserSchema.safeParse({ userId });
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Check if user exists
    const existingUser = await getUserByIdQuery(userId);
    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Update user status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        status: "active",
        suspended_at: null,
        suspended_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to reactivate user: ${updateError.message}`,
      };
    }

    // Log action
    await logAdminAction({
      actorId: authResult.user.id,
      action: "user_reactivated",
      resourceType: "user",
      resourceId: userId,
      supabase,
    });

    return { success: true, data: { userId } };
  } catch (error) {
    console.error("[admin] Error reactivating user", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reactivate user",
    };
  }
}

/**
 * Change a user's role
 */
export async function changeUserRole(
  userId: string,
  role: "teacher" | "student" | "platform_admin"
): Promise<AdminActionResult<{ userId: string; role: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Prevent platform_admin from changing their own role
    if (authResult.user.id === userId && role !== "platform_admin") {
      return {
        success: false,
        error: "Cannot change your own role",
      };
    }

    // Validate input
    const validation = changeUserRoleSchema.safeParse({ userId, role });
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Check if user exists and get current role
    const existingUser = await getUserByIdQuery(userId);
    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    const oldRole = (existingUser as { role?: string })?.role;

    // Update user role in users table
    const { error: updateError } = await supabase
      .from("users")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to change user role: ${updateError.message}`,
      };
    }

    // Update auth.users app_metadata role using Admin API
    try {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          app_metadata: {
            role,
          },
        }
      );

      if (authUpdateError) {
        console.warn("[admin] Failed to update auth.users app_metadata", authUpdateError);
        // Don't fail the operation - users table is updated
      }
    } catch (err) {
      console.warn("[admin] Error updating auth.users app_metadata", err);
    }

    // Log action
    await logAdminAction({
      actorId: authResult.user.id,
      action: "user_role_changed",
      resourceType: "user",
      resourceId: userId,
      payload: { oldRole, newRole: role },
      supabase,
    });

    return { success: true, data: { userId, role } };
  } catch (error) {
    console.error("[admin] Error changing user role", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to change user role",
    };
  }
}

/**
 * Reset a user's MFA
 */
export async function resetUserMFA(
  userId: string
): Promise<AdminActionResult<{ userId: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Check if user exists
    const existingUser = await getUserByIdQuery(userId);
    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Delete all MFA factors using Admin API
    try {
      const { data: factors, error: factorsError } =
        await supabase.auth.admin.mfa.listFactors({ userId });

      if (factorsError) {
        console.warn("[admin] Failed to list MFA factors", factorsError);
      } else if (factors && factors.factors) {
        // Delete all TOTP factors
        // Use type assertion to access type property
        const totpFactors = factors.factors.filter((f) => (f as any).type === "totp");
        for (const factor of totpFactors) {
          const { error: deleteError } = await supabase.auth.admin.mfa.deleteFactor({
            id: factor.id,
            userId,
          });

          if (deleteError) {
            console.warn("[admin] Failed to delete MFA factor", deleteError);
          }
        }
      }
    } catch (err) {
      console.warn("[admin] Error deleting MFA factors", err);
    }

    // Update user record
    const { error: updateError } = await supabase
      .from("users")
      .update({
        mfa_enabled: false,
        mfa_enabled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to reset MFA: ${updateError.message}`,
      };
    }

    // Log action
    await logAdminAction({
      actorId: authResult.user.id,
      action: "user_mfa_reset",
      resourceType: "user",
      resourceId: userId,
      supabase,
    });

    return { success: true, data: { userId } };
  } catch (error) {
    console.error("[admin] Error resetting user MFA", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reset user MFA",
    };
  }
}

/**
 * Revoke all user sessions (force logout)
 */
export async function revokeUserSessions(
  userId: string
): Promise<AdminActionResult<{ userId: string }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Check if user exists
    const existingUser = await getUserByIdQuery(userId);
    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Sign out user from all devices using Admin API
    const { error: signOutError } = await supabase.auth.admin.signOut(
      userId,
      "global"
    );

    if (signOutError) {
      return {
        success: false,
        error: `Failed to revoke sessions: ${signOutError.message}`,
      };
    }

    // Log action
    await logAdminAction({
      actorId: authResult.user.id,
      action: "user_sessions_revoked",
      resourceType: "user",
      resourceId: userId,
      supabase,
    });

    return { success: true, data: { userId } };
  } catch (error) {
    console.error("[admin] Error revoking user sessions", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to revoke user sessions",
    };
  }
}

