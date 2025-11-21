import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { logAuthEvent, extractRequestMetadata } from "@/lib/auth/audit";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const runtime = "nodejs";

const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = acceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const adminClient = getServiceRoleSupabaseClient();
    const requestMetadata = extractRequestMetadata(request);

    // Validate token first
    const { data: userRecord, error: userError } = await adminClient
      .from("users")
      .select(
        "id, invite_token, invite_token_expires_at, tenant_owner_id, email, role, metadata"
      )
      .eq("invite_token", token)
      .maybeSingle();

    if (userError || !userRecord) {
      await logAuthEvent({
        action: "teacher_invite_acceptance_failure",
        payload: {
          ...requestMetadata,
          error: "Token not found",
          error_code: "token_not_found",
        },
      });
      return NextResponse.json(
        { success: false, error: "Invalid invite link" },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = userRecord.invite_token_expires_at
      ? new Date(userRecord.invite_token_expires_at)
      : null;

    if (expiresAt && expiresAt < now) {
      await logAuthEvent({
        actorId: userRecord.id,
        action: "teacher_invite_acceptance_failure",
        resourceType: "user",
        resourceId: userRecord.id,
        payload: {
          ...requestMetadata,
          error: "Token expired",
          error_code: "token_expired",
        },
      });
      return NextResponse.json(
        { success: false, error: "This invite link has expired" },
        { status: 400 }
      );
    }

    // Check if already used
    if (userRecord.tenant_owner_id) {
      await logAuthEvent({
        actorId: userRecord.id,
        action: "teacher_invite_acceptance_failure",
        resourceType: "user",
        resourceId: userRecord.id,
        payload: {
          ...requestMetadata,
          error: "Token already used",
          error_code: "token_already_used",
        },
      });
      return NextResponse.json(
        { success: false, error: "This invite link has already been used" },
        { status: 400 }
      );
    }

    // Get email - try from userRecord first, then from auth.users
    let email = userRecord.email;
    if (!email) {
      try {
        const { data: authUser } = await adminClient.auth.admin.getUserById(
          userRecord.id
        );
        email = authUser?.user?.email;
      } catch (err) {
        console.error("[invite] Error fetching auth user", err);
      }
    }

    if (!email) {
      await logAuthEvent({
        actorId: userRecord.id,
        action: "teacher_invite_acceptance_failure",
        resourceType: "user",
        resourceId: userRecord.id,
        payload: {
          ...requestMetadata,
          error: "Email not found",
          error_code: "email_not_found",
        },
      });
      return NextResponse.json(
        { success: false, error: "User email not found" },
        { status: 400 }
      );
    }

    // Find tenant that should be assigned to this teacher
    // Since tenants.teacher_owner_id is NOT NULL, the tenant must already exist
    // with a placeholder owner. We need to find the tenant that matches this invite.
    // Check if tenant_id is stored in users.metadata or if we need another approach.
    // For now, we'll look for tenants where teacher_owner_id matches the user's auth ID
    // (in case the tenant was pre-created with this user's ID)
    // Or check users.metadata for tenant_id
    
    let tenantId: string | null = null;
    
    // Check if tenant_id is in user metadata
    if (userRecord.metadata && typeof userRecord.metadata === 'object') {
      const metadata = userRecord.metadata as Record<string, unknown>;
      if (typeof metadata.tenant_id === 'string') {
        tenantId = metadata.tenant_id;
      }
    }
    
    // If no tenant_id in metadata, try to find tenant by teacher_owner_id matching userRecord.id
    // (in case tenant was pre-created)
    if (!tenantId) {
      const { data: existingTenant } = await adminClient
        .from("tenants")
        .select("id, subdomain, status")
        .eq("teacher_owner_id", userRecord.id)
        .maybeSingle();
      
      if (existingTenant) {
        tenantId = existingTenant.id;
      }
    }
    
    if (!tenantId) {
      await logAuthEvent({
        actorId: userRecord.id,
        action: "teacher_invite_acceptance_failure",
        resourceType: "user",
        resourceId: userRecord.id,
        payload: {
          ...requestMetadata,
          error: "No tenant associated with this invite",
          error_code: "no_tenant_associated",
        },
      });
      return NextResponse.json(
        { success: false, error: "No tenant associated with this invite. Please contact support." },
        { status: 400 }
      );
    }
    
    // Get tenant details
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id, subdomain, status, teacher_owner_id")
      .eq("id", tenantId)
      .maybeSingle();
    
    if (tenantError || !tenant) {
      await logAuthEvent({
        actorId: userRecord.id,
        action: "teacher_invite_acceptance_failure",
        resourceType: "user",
        resourceId: userRecord.id,
        payload: {
          ...requestMetadata,
          error: "Tenant not found",
          error_code: "tenant_not_found",
        },
      });
      return NextResponse.json(
        { success: false, error: "Associated tenant not found" },
        { status: 400 }
      );
    }
    
    // Verify tenant is not already assigned to a different user
    if (tenant.teacher_owner_id && tenant.teacher_owner_id !== userRecord.id) {
      await logAuthEvent({
        actorId: userRecord.id,
        action: "teacher_invite_acceptance_failure",
        resourceType: "tenant",
        resourceId: tenant.id,
        payload: {
          ...requestMetadata,
          error: "Tenant already assigned to another teacher",
          error_code: "tenant_already_assigned",
        },
      });
      return NextResponse.json(
        { success: false, error: "Tenant is already assigned to another teacher" },
        { status: 400 }
      );
    }

    // Since tenant.teacher_owner_id is NOT NULL and references auth.users(id),
    // the auth user must already exist (created during tenant provisioning)
    // We just need to update the password and metadata
    let authUser;
    try {
      // Get the existing auth user (should exist since tenant references it)
      const { data: existingAuthUser, error: getUserError } =
        await adminClient.auth.admin.getUserById(userRecord.id);

      if (getUserError || !existingAuthUser?.user) {
        console.error("[invite] Auth user not found", getUserError);
        await logAuthEvent({
          actorId: userRecord.id,
          action: "teacher_invite_acceptance_failure",
          resourceType: "user",
          resourceId: userRecord.id,
          payload: {
            ...requestMetadata,
            error: "Auth user not found",
            error_code: "auth_user_not_found",
          },
        });
        return NextResponse.json(
          { success: false, error: "User account not found" },
          { status: 400 }
        );
      }

      // Update the auth user with password and metadata
      const { data: updatedUser, error: updateError } =
        await adminClient.auth.admin.updateUserById(userRecord.id, {
          password,
          email_confirm: true,
          app_metadata: {
            ...(existingAuthUser.user.app_metadata ?? {}),
            role: "teacher",
            tenant_id: tenant.id,
          },
          user_metadata: {
            ...(existingAuthUser.user.user_metadata ?? {}),
            tenant_id: tenant.id,
          },
        });

      if (updateError) {
        console.error("[invite] Failed to update auth user", updateError);
        await logAuthEvent({
          actorId: userRecord.id,
          action: "teacher_invite_acceptance_failure",
          resourceType: "user",
          resourceId: userRecord.id,
          payload: {
            ...requestMetadata,
            error: updateError.message,
            error_code: "auth_update_failed",
          },
        });
        return NextResponse.json(
          { success: false, error: "Failed to update account" },
          { status: 500 }
        );
      }

      authUser = updatedUser?.user ?? existingAuthUser.user;

        // Update users table
        const { error: updateUserError } = await adminClient
          .from("users")
          .update({
            role: "teacher",
            tenant_owner_id: tenant.id,
            invite_token: null,
            invite_token_expires_at: null,
            email_verified: true,
            email_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", authUser.id);

        if (updateUserError) {
          console.error("[invite] Failed to update users table", updateUserError);
          await logAuthEvent({
            actorId: authUser.id,
            action: "teacher_invite_acceptance_failure",
            resourceType: "user",
            resourceId: authUser.id,
            payload: {
              ...requestMetadata,
              error: "Failed to update user record",
              error_code: "user_update_failed",
            },
          });
          return NextResponse.json(
            { success: false, error: "Failed to complete setup" },
            { status: 500 }
          );
        }

        // Update tenants table - ensure tenant is active (teacher_owner_id already set)
        const { error: updateTenantError } = await adminClient
          .from("tenants")
          .update({
            status: "active", // Set to active after teacher setup
            updated_at: new Date().toISOString(),
          })
          .eq("id", tenant.id);

        if (updateTenantError) {
          console.error(
            "[invite] Failed to update tenants table",
            updateTenantError
          );
          await logAuthEvent({
            actorId: authUser.id,
            action: "teacher_invite_acceptance_failure",
            resourceType: "tenant",
            resourceId: tenant.id,
            payload: {
              ...requestMetadata,
              error: "Failed to assign tenant ownership",
              error_code: "tenant_update_failed",
            },
          });
          return NextResponse.json(
            { success: false, error: "Failed to assign tenant" },
            { status: 500 }
          );
        }

        // Create session for the user
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const passwordClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        const { data: sessionData, error: sessionError } =
          await passwordClient.auth.signInWithPassword({
            email,
            password,
          });

        if (sessionError || !sessionData.session) {
          console.error("[invite] Failed to create session", sessionError);
          await logAuthEvent({
            actorId: authUser.id,
            action: "teacher_invite_acceptance_failure",
            resourceType: "session",
            payload: {
              ...requestMetadata,
              error: sessionError?.message || "Session creation failed",
              error_code: "session_creation_failed",
            },
          });
          return NextResponse.json(
            { success: false, error: "Failed to create session" },
            { status: 500 }
          );
        }

        await logAuthEvent({
          tenantId: tenant.id,
          actorId: authUser.id,
          action: "teacher_invite_acceptance_success",
          resourceType: "user",
          resourceId: authUser.id,
          payload: {
            ...requestMetadata,
            tenant_id: tenant.id,
            tenant_subdomain: tenant.subdomain,
          },
        });

        return NextResponse.json({
          success: true,
          session: {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
          },
          redirectTo: "/teachers/mfa-setup",
        });
  } catch (error) {
    console.error("[invite] Unexpected error accepting invite", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

