"use server";

import { requireSuperAdminAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/auth/audit";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  updateSystemSettingsSchema,
  updateFeatureFlagSchema,
  updateBrandingSchema,
} from "@/lib/schemas/admin";
import type { AdminActionResult } from "@/lib/admin/types";

/**
 * Get system settings
 * Note: Currently returns defaults. Create a system_settings table to persist values.
 */
export async function getSystemSettings(): Promise<
  AdminActionResult<Record<string, unknown>>
> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Try to fetch from system_settings table if it exists
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "system_config")
        .maybeSingle();

      if (!error && data) {
        return { success: true, data: (data.value as Record<string, unknown>) || {} };
      }
    } catch (err) {
      // Table doesn't exist yet - use defaults
    }

    // Return default system settings
    return {
      success: true,
      data: {
        session_timeout_hours: 12,
        telegram_poll_interval_seconds: 5,
        invite_expiration_days: 14,
      },
    };
  } catch (error) {
    console.error("[admin] Error fetching system settings", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch system settings",
    };
  }
}

/**
 * Update system settings
 * Note: Create a system_settings table to persist values.
 */
export async function updateSystemSettings(
  data: Record<string, unknown>
): Promise<AdminActionResult<Record<string, unknown>>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = updateSystemSettingsSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Try to upsert to system_settings table if it exists
    try {
      const { error: upsertError } = await supabase
        .from("system_settings")
        .upsert(
          {
            key: "system_config",
            value: validation.data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (!upsertError) {
        // Log action
        await logAdminAction({
          actorId: authResult.user.id,
          action: "settings_updated",
          resourceType: "system_settings",
          resourceId: null,
          payload: validation.data,
          supabase,
        });

        return { success: true, data: validation.data };
      }
    } catch (err) {
      // Table doesn't exist yet
      console.warn(
        "[admin] system_settings table not found. Create migration to add it."
      );
    }

    // For now, return success but settings won't persist
    // TODO: Create system_settings table migration
    return {
      success: false,
      error:
        "System settings table not found. Please create a system_settings table first.",
    };
  } catch (error) {
    console.error("[admin] Error updating system settings", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update system settings",
    };
  }
}

/**
 * Get all feature flags
 * Note: Currently returns defaults. Create a system_settings table to persist values.
 */
export async function getFeatureFlags(): Promise<
  AdminActionResult<Record<string, boolean>>
> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Try to fetch from system_settings table if it exists
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "feature_flags")
        .maybeSingle();

      if (!error && data) {
        return {
          success: true,
          data: (data.value as Record<string, boolean>) || {},
        };
      }
    } catch (err) {
      // Table doesn't exist yet - use defaults
    }

    // Return default feature flags
    return {
      success: true,
      data: {
        tenant_branding: true,
        audit_webhooks: false,
        student_payments: false,
      },
    };
  } catch (error) {
    console.error("[admin] Error fetching feature flags", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch feature flags",
    };
  }
}

/**
 * Update a feature flag
 */
export async function updateFeatureFlag(
  flag: string,
  enabled: boolean
): Promise<AdminActionResult<{ flag: string; enabled: boolean }>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = updateFeatureFlagSchema.safeParse({ flag, enabled });
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Fetch current feature flags
    let currentFlags: Record<string, boolean> = {};
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "feature_flags")
        .maybeSingle();

      if (!error && data) {
        currentFlags = (data.value as Record<string, boolean>) || {};
      }
    } catch (err) {
      // Table doesn't exist yet - use defaults
      currentFlags = {
        tenant_branding: true,
        audit_webhooks: false,
        student_payments: false,
      };
    }

    // Update the flag
    const updatedFlags = {
      ...currentFlags,
      [flag]: enabled,
    };

    // Try to upsert to system_settings table if it exists
    try {
      const { error: upsertError } = await supabase
        .from("system_settings")
        .upsert(
          {
            key: "feature_flags",
            value: updatedFlags,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (!upsertError) {
        // Log action
        await logAdminAction({
          actorId: authResult.user.id,
          action: "feature_flag_toggled",
          resourceType: "feature_flag",
          resourceId: flag,
          payload: { enabled },
          supabase,
        });

        return {
          success: true,
          data: { flag, enabled },
        };
      }
    } catch (err) {
      // Table doesn't exist yet
      console.warn(
        "[admin] system_settings table not found. Create migration to add it."
      );
    }

    // For now, return success but flags won't persist
    // TODO: Create system_settings table migration
    return {
      success: false,
      error:
        "System settings table not found. Please create a system_settings table first.",
    };
  } catch (error) {
    console.error("[admin] Error updating feature flag", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update feature flag",
    };
  }
}

/**
 * Get default branding settings
 */
export async function getBrandingSettings(): Promise<
  AdminActionResult<Record<string, unknown>>
> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Try to fetch from system_settings table if it exists
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "branding_defaults")
        .maybeSingle();

      if (!error && data) {
        return {
          success: true,
          data: (data.value as Record<string, unknown>) || {},
        };
      }
    } catch (err) {
      // Table doesn't exist yet - use defaults
    }

    // Return default branding settings
    return {
      success: true,
      data: {
        default_theme: "light",
        email_from_name: "Course Management Platform",
        support_url: "https://support.example.com",
      },
    };
  } catch (error) {
    console.error("[admin] Error fetching branding settings", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch branding settings",
    };
  }
}

/**
 * Update default branding settings
 */
export async function updateBrandingSettings(
  data: Record<string, unknown>
): Promise<AdminActionResult<Record<string, unknown>>> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = updateBrandingSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const supabase = getServiceRoleSupabaseClient();

    // Try to upsert to system_settings table if it exists
    try {
      const { error: upsertError } = await supabase
        .from("system_settings")
        .upsert(
          {
            key: "branding_defaults",
            value: validation.data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (!upsertError) {
        // Log action
        await logAdminAction({
          actorId: authResult.user.id,
          action: "branding_updated",
          resourceType: "branding_settings",
          resourceId: null,
          payload: validation.data,
          supabase,
        });

        return { success: true, data: validation.data };
      }
    } catch (err) {
      // Table doesn't exist yet
      console.warn(
        "[admin] system_settings table not found. Create migration to add it."
      );
    }

    // For now, return success but settings won't persist
    // TODO: Create system_settings table migration
    return {
      success: false,
      error:
        "System settings table not found. Please create a system_settings table first.",
    };
  } catch (error) {
    console.error("[admin] Error updating branding settings", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update branding settings",
    };
  }
}

