'use server';

import { TENANT_FULL_VIEW } from "@/constants/tables";
import { TenantFull, tenantBrandingSchema, type PlanType } from "@/lib/schemas/tenant";
import { createClient } from "@/lib/supabase/server";
import { claimTenantInviteSchema } from "@/lib/schemas/admin";
import { getValidTenantInvite } from "@/lib/admin/actions/tenants";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { logAuthEvent } from "@/lib/auth/audit";

export async function loginAdmin(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user?.app_metadata.role !== "platform_admin") {
    throw new Error("User is not a platform admin.");
  }

  return data.user;
}

export async function getAllTenantsFull() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TENANT_FULL_VIEW)
    .select("*")
    .order("created_at", { ascending: false })
    .overrideTypes<TenantFull[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? data : [];
}

type ClaimTenantInviteResult =
  | { success: true; data: { tenantId: string; teacherId: string } }
  | { success: false; error: string };

export async function claimTenantInvite(input: unknown): Promise<ClaimTenantInviteResult> {
  const validation = claimTenantInviteSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: "Invalid request payload" };
  }

  const { token, teacher, tenant } = validation.data;
  const inviteResult = await getValidTenantInvite(token);

  if (!inviteResult.success) {
    const errorMap: Record<string, string> = {
      not_found: "Invite link is invalid",
      revoked: "Invite has been revoked",
      claimed: "Invite has already been used",
      expired: "Invite has expired",
    };
    return { success: false, error: errorMap[inviteResult.error] || "Invite validation failed" };
  }

  const supabase = getServiceRoleSupabaseClient();
  const invite = inviteResult.invite;

  const {
    data: createdUser,
    error: userError,
  } = await supabase.auth.admin.createUser({
    email: teacher.email,
    password: teacher.password,
    email_confirm: true,
    app_metadata: {
      role: "teacher",
    },
    user_metadata: {
      first_name: teacher.firstName,
      last_name: teacher.lastName,
      display_name: teacher.displayName,
    },
  });

  if (userError || !createdUser?.user) {
    return {
      success: false,
      error: userError?.message || "Failed to create teacher account",
    };
  }

  const teacherUserId = createdUser.user.id;
  const profile = {
    first_name: teacher.firstName,
    last_name: teacher.lastName,
    display_name: teacher.displayName,
  };

  const nowIso = new Date().toISOString();
  const { error: userInsertError } = await supabase.from("users").insert({
    id: teacherUserId,
    role: "teacher",
    status: "active",
    email_verified: true,
    email_verified_at: nowIso,
    profile,
  });

  if (userInsertError) {
    await supabase.auth.admin.deleteUser(teacherUserId);
    return {
      success: false,
      error: userInsertError.message,
    };
  }

  const inviteMetadata = (invite.metadata ?? {}) as Record<string, unknown>;
  const metadataBranding = inviteMetadata.branding as Record<string, unknown> | undefined;
  let derivedBranding = tenant.branding;
  if (!derivedBranding && metadataBranding) {
    const parsedBranding = tenantBrandingSchema.safeParse(metadataBranding);
    if (parsedBranding.success) {
      derivedBranding = parsedBranding.data;
    }
  }
  const branding =
    derivedBranding ?? {
      name: tenant.subdomain,
      description: `${tenant.subdomain} workspace`,
      entry_content: {},
    };

  const planType = (
    tenant.plan_type ??
    (inviteMetadata.plan_type as PlanType | undefined) ??
    "free"
  ) as PlanType;

  const { data: tenantRow, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      subdomain: tenant.subdomain,
      teacher_owner_id: teacherUserId,
      status: "active",
      branding,
      plan_type: planType,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (tenantError || !tenantRow) {
    await supabase.auth.admin.deleteUser(teacherUserId);
    return {
      success: false,
      error: tenantError?.message || "Failed to create tenant",
    };
  }

  const tenantId = tenantRow.id;

  await supabase
    .from("users")
    .update({
      tenant_owner_id: tenantId,
      tenant_id: tenantId,
      updated_at: nowIso,
    })
    .eq("id", teacherUserId);

  await supabase
    .from("tenant_invites")
    .update({
      status: "claimed",
      claimed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", invite.id);

  await logAuthEvent({
    actorId: teacherUserId,
    action: "tenant_invite_claimed",
    resourceType: "tenant_invite",
    resourceId: invite.id,
    payload: {
      tenant_id: tenantId,
      email: teacher.email,
    },
    supabase,
  });

  return {
    success: true,
    data: {
      tenantId,
      teacherId: teacherUserId,
    },
  };
}