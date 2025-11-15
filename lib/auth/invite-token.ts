import { randomBytes } from "crypto";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";

/**
 * Generate a secure random token for teacher invites
 * @param length - Length of token in bytes (default: 32)
 * @returns Base64-encoded token string
 */
export function generateInviteToken(length: number = 32): string {
  return randomBytes(length).toString("base64url");
}

/**
 * Store an invite token in the users table
 * @param userId - The user ID (auth.users.id) to associate the token with
 * @param expiresInDays - Number of days until token expires (default: 7)
 * @returns The generated token string
 */
export async function storeInviteToken(
  userId: string,
  expiresInDays: number = 7
): Promise<string> {
  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const adminClient = getServiceRoleSupabaseClient();

  const { error } = await adminClient
    .from("users")
    .update({
      invite_token: token,
      invite_token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to store invite token: ${error.message}`);
  }

  return token;
}

/**
 * Associate an invite token with a tenant (for future use)
 * This can be used to store tenant_id in user metadata if needed
 * @param userId - The user ID
 * @param tenantId - The tenant ID to associate
 */
export async function associateTokenWithTenant(
  userId: string,
  tenantId: string
): Promise<void> {
  const adminClient = getServiceRoleSupabaseClient();

  // Get current metadata
  const { data: userRecord, error: fetchError } = await adminClient
    .from("users")
    .select("metadata")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError || !userRecord) {
    throw new Error(`Failed to fetch user: ${fetchError?.message}`);
  }

  const metadata = (userRecord.metadata as Record<string, unknown>) || {};
  metadata.tenant_id = tenantId;

  const { error } = await adminClient
    .from("users")
    .update({
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to associate token with tenant: ${error.message}`);
  }
}

/**
 * Generate and store an invite token for a teacher user
 * This is a convenience function that combines token generation and storage
 * @param userId - The user ID (auth.users.id)
 * @param tenantId - Optional tenant ID to associate with the token
 * @param expiresInDays - Number of days until token expires (default: 7)
 * @returns The generated token string
 */
export async function createTeacherInviteToken(
  userId: string,
  tenantId?: string,
  expiresInDays: number = 7
): Promise<string> {
  const token = await storeInviteToken(userId, expiresInDays);

  if (tenantId) {
    await associateTokenWithTenant(userId, tenantId);
  }

  return token;
}

