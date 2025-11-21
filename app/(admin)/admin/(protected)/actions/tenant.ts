'use server';

import { getAllTenantsFull } from "@/supabase/servers/admin";
import { requireSuperAdminAuth } from "@/lib/auth";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auth/audit";
import { TENANT_INVITES_TABLE } from "@/constants/tables";
import { createTenantInviteSchema } from "@/lib/schemas/admin";
import { createHash } from "crypto";
import { generateInviteToken } from "@/lib/auth/invite-token";
import { sendTenantInviteEmail } from "@/lib/email/send-tenant-invite";
import type { TenantInviteStatus } from "@/lib/admin/types";

const DEFAULT_INVITE_EXPIRY_HOURS = 24 * 7;

export async function getAllTenantsFullAction() {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return {
        success: false,
        error: authResult.error,
        data: [],
      };
    }
    const tenants = await getAllTenantsFull();
    return {
      success: true,
      data: tenants,
    };
  } catch (error: any) {
    console.error("[admin] Error fetching tenants", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tenants",
      data: [],
    };
  }
}

type CreateTenantInviteResult =
  | { success: true; data: { inviteId: string; token: string } }
  | { success: false; error: string };

type TenantInviteActionResult =
  | { success: true; data?: { inviteId: string } }
  | { success: false; error: string };

type TenantInviteRecord = {
  id: string;
  email: string;
  status: TenantInviteStatus;
  expires_at: string;
  issued_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  claimed_at: string | null;
};

type GetTenantInvitesResult =
  | { success: true; data: TenantInviteRecord[] }
  | { success: false; error: string; data: TenantInviteRecord[] };

export async function createTenantInviteAction(
  input: unknown,
): Promise<CreateTenantInviteResult> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    const validation = createTenantInviteSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    const { email, metadata, expiresInHours } = validation.data;
    const inviteMetadata = (metadata ?? {}) as Record<string, unknown>;
    const recipientName =
      typeof inviteMetadata.recipientName === "string"
        ? inviteMetadata.recipientName
        : undefined;
    const notes =
      typeof inviteMetadata.notes === "string" ? inviteMetadata.notes : undefined;
    const rawToken = generateInviteToken(32);
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAtOverride =
      typeof expiresInHours === "number"
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
        : null;

    const supabase = getServiceRoleSupabaseClient();
    const { data: inviteRow, error: insertError } = await supabase
      .from(TENANT_INVITES_TABLE)
      .insert({
        email,
        token_hash: tokenHash,
        metadata: metadata ?? {},
        issued_by: authResult.user.id,
        ...(expiresAtOverride ? { expires_at: expiresAtOverride } : {}),
      })
      .select("id, email, expires_at")
      .single();

    if (insertError || !inviteRow) {
      return {
        success: false,
        error: insertError?.message ?? "Failed to create invite",
      };
    }

    try {
      await sendTenantInviteEmail({
        email: inviteRow.email,
        token: rawToken,
        expiresAt: inviteRow.expires_at,
        recipientName,
        notes,
      });
    } catch (emailError) {
      console.error("[admin] Failed to dispatch tenant invite email", emailError);
    }

    await logAdminAction({
      actorId: authResult.user.id,
      action: "tenant_invite_created",
      resourceType: "tenant_invite",
      resourceId: inviteRow.id,
      payload: {
        email,
        expires_at: inviteRow.expires_at,
      },
      supabase,
    });

    return {
      success: true,
      data: {
        inviteId: inviteRow.id,
        token: rawToken,
      },
    };
  } catch (error) {
    console.error("[admin] Error creating tenant invite", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create tenant invite",
    };
  }
}

export async function getTenantInvitesAction(): Promise<GetTenantInvitesResult> {
  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return {
        success: false,
        error: authResult.error,
        data: [],
      };
    }

    const supabase = getServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from(TENANT_INVITES_TABLE)
      .select("id, email, status, expires_at, issued_by, metadata, created_at, claimed_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) {
      return {
        success: false,
        error: error?.message ?? "Failed to load tenant invites",
        data: [],
      };
    }

    return { success: true, data: data as TenantInviteRecord[] };
  } catch (error) {
    console.error("[admin] Error fetching tenant invites", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tenant invites",
      data: [],
    };
  }
}

export async function resendTenantInviteAction(
  inviteId: string,
): Promise<TenantInviteActionResult> {
  if (!inviteId) {
    return { success: false, error: "Invite ID is required" };
  }

  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = getServiceRoleSupabaseClient();
    const { data: invite, error } = await supabase
      .from(TENANT_INVITES_TABLE)
      .select("id, email, status, metadata")
      .eq("id", inviteId)
      .single();

    if (error || !invite) {
      return { success: false, error: "Invite not found" };
    }

    if (invite.status === "claimed") {
      return { success: false, error: "Invite already claimed" };
    }

    const inviteMetadata = (invite.metadata ?? {}) as Record<string, unknown>;
    const recipientName =
      typeof inviteMetadata.recipientName === "string"
        ? inviteMetadata.recipientName
        : undefined;
    const notes =
      typeof inviteMetadata.notes === "string" ? inviteMetadata.notes : undefined;

    const rawToken = generateInviteToken(32);
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const newExpiry = new Date(
      Date.now() + DEFAULT_INVITE_EXPIRY_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { error: updateError } = await supabase
      .from(TENANT_INVITES_TABLE)
      .update({
        token_hash: tokenHash,
        status: "pending",
        expires_at: newExpiry,
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inviteId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update invite: ${updateError.message}`,
      };
    }

    await sendTenantInviteEmail({
      email: invite.email,
      token: rawToken,
      expiresAt: newExpiry,
      recipientName,
      notes,
    });

    await logAdminAction({
      actorId: authResult.user.id,
      action: "tenant_invite_resent",
      resourceType: "tenant_invite",
      resourceId: inviteId,
      payload: {
        email: invite.email,
        expires_at: newExpiry,
      },
      supabase,
    });

    return { success: true, data: { inviteId } };
  } catch (error) {
    console.error("[admin] Error resending tenant invite", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resend tenant invite",
    };
  }
}

export async function revokeTenantInviteAction(
  inviteId: string,
): Promise<TenantInviteActionResult> {
  if (!inviteId) {
    return { success: false, error: "Invite ID is required" };
  }

  try {
    const authResult = await requireSuperAdminAuth();
    if ("error" in authResult) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = getServiceRoleSupabaseClient();
    const { data: invite, error } = await supabase
      .from(TENANT_INVITES_TABLE)
      .select("id, status")
      .eq("id", inviteId)
      .single();

    if (error || !invite) {
      return { success: false, error: "Invite not found" };
    }

    if (invite.status === "claimed") {
      return { success: false, error: "Invite already claimed" };
    }

    const { error: updateError } = await supabase
      .from(TENANT_INVITES_TABLE)
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", inviteId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to revoke invite: ${updateError.message}`,
      };
    }

    await logAdminAction({
      actorId: authResult.user.id,
      action: "tenant_invite_revoked",
      resourceType: "tenant_invite",
      resourceId: inviteId,
      supabase,
    });

    return { success: true, data: { inviteId } };
  } catch (error) {
    console.error("[admin] Error revoking tenant invite", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to revoke tenant invite",
    };
  }
}