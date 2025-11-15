import { getServerSupabaseClient } from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Audit log action types for Telegram authentication
 */
export type AuditAction =
  | "telegram_login_attempt"
  | "telegram_login_success"
  | "telegram_login_failure"
  | "telegram_login_timeout"
  | "telegram_login_cancelled"
  | "telegram_bot_approval"
  | "telegram_bot_cancel"
  | "teacher_invite_validation_success"
  | "teacher_invite_validation_failure"
  | "teacher_invite_acceptance_success"
  | "teacher_invite_acceptance_failure";

/**
 * Resource types that can be referenced in audit logs
 */
export type ResourceType = "login_nonce" | "user" | "tenant" | "session";

/**
 * Payload structure for audit log entries
 */
export type AuditPayload = {
  ip_address?: string;
  user_agent?: string;
  telegram_user_id?: number;
  telegram_username?: string;
  nonce?: string;
  error?: string;
  error_code?: string;
  tenant_slug?: string;
  redirect_path?: string;
  rate_limited?: boolean;
  [key: string]: unknown;
};

type LogAuthEventArgs = {
  tenantId?: string | null;
  actorId?: string | null;
  action: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  payload?: AuditPayload;
  supabase?: SupabaseClient;
};

/**
 * Log an authentication event to the audit_logs table
 * This function is fire-and-forget and will not throw errors
 * to avoid breaking the authentication flow
 */
export async function logAuthEvent({
  tenantId,
  actorId,
  action,
  resourceType,
  resourceId,
  payload = {},
  supabase,
}: LogAuthEventArgs): Promise<void> {
  try {
    const client = supabase ?? (await getServerSupabaseClient());

    const { error } = await client.from("audit_logs").insert({
      tenant_id: tenantId || null,
      actor_id: actorId || null,
      action,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      payload: payload || {},
    });

    if (error) {
      // Log error but don't throw - audit logging should not break auth flow
      console.error("[audit] Failed to log auth event", {
        action,
        error: error.message,
      });
    }
  } catch (error) {
    // Silently fail - audit logging should never break authentication
    console.error("[audit] Unexpected error logging auth event", error);
  }
}

/**
 * Helper to extract IP and user agent from NextRequest for audit logging
 */
export function extractRequestMetadata(request: {
  headers: {
    get: (name: string) => string | null;
    has: (name: string) => boolean;
  };
}): { ipAddress?: string; userAgent?: string } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded
    ? forwarded.split(",")[0]?.trim()
    : request.headers.get("x-real-ip") || null;

  const userAgent = request.headers.get("user-agent") || undefined;

  return {
    ipAddress: ipAddress || undefined,
    userAgent,
  };
}

