import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { logAuthEvent, extractRequestMetadata } from "@/lib/auth/audit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const adminClient = getServiceRoleSupabaseClient();
    const requestMetadata = extractRequestMetadata(request);

    // Query users table for invite token
    const { data: userRecord, error: userError } = await adminClient
      .from("users")
      .select(
        "id, invite_token, invite_token_expires_at, tenant_owner_id, email"
      )
      .eq("invite_token", token)
      .maybeSingle();

    if (userError) {
      console.error("[invite] Error querying user by token", userError);
      await logAuthEvent({
        action: "teacher_invite_validation_failure",
        resourceType: "user",
        payload: {
          ...requestMetadata,
          error: "Database error",
          error_code: "db_query_failed",
        },
      });
      return NextResponse.json(
        { valid: false, error: "Failed to validate token" },
        { status: 500 }
      );
    }

    if (!userRecord) {
      await logAuthEvent({
        action: "teacher_invite_validation_failure",
        resourceType: "user",
        payload: {
          ...requestMetadata,
          error: "Token not found",
          error_code: "token_not_found",
        },
      });
      return NextResponse.json({
        valid: false,
        error: "Invalid invite link",
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = userRecord.invite_token_expires_at
      ? new Date(userRecord.invite_token_expires_at)
      : null;

    if (expiresAt && expiresAt < now) {
      await logAuthEvent({
        action: "teacher_invite_validation_failure",
        resourceType: "user",
        resourceId: userRecord.id,
        payload: {
          ...requestMetadata,
          error: "Token expired",
          error_code: "token_expired",
        },
      });
      return NextResponse.json({
        valid: false,
        expired: true,
        error: "This invite link has expired",
      });
    }

    // Check if token has already been used (no tenant_owner_id means not yet accepted)
    // Actually, we should check if the user has a password set or if tenant_owner_id is set
    // For now, we'll check if tenant_owner_id exists as a sign the invite was accepted
    if (userRecord.tenant_owner_id) {
      await logAuthEvent({
        action: "teacher_invite_validation_failure",
        resourceType: "user",
        resourceId: userRecord.id,
        payload: {
          ...requestMetadata,
          error: "Token already used",
          error_code: "token_already_used",
        },
      });
      return NextResponse.json({
        valid: false,
        used: true,
        error: "This invite link has already been used",
      });
    }

    // Get tenant information if tenant_owner_id is set (it shouldn't be, but check anyway)
    // Actually, we need to find the tenant that should be associated with this user
    // The tenant might not have teacher_owner_id set yet, so we need another way to link
    // For now, let's check if there's a tenant waiting for this user
    // We'll need to query tenants table to find a tenant that should be owned by this user
    // But since tenant.teacher_owner_id references auth.users, we can't find it until user is created
    // So for now, we'll return basic user info

    // Get email from auth.users if available
    let email = userRecord.email;
    if (!email) {
      // Try to get email from auth.users
      const { data: authUser } = await adminClient.auth.admin.getUserById(
        userRecord.id
      );
      email = authUser?.user?.email;
    }

    await logAuthEvent({
      actorId: userRecord.id,
      action: "teacher_invite_validation_success",
      resourceType: "user",
      resourceId: userRecord.id,
      payload: {
        ...requestMetadata,
      },
    });

    return NextResponse.json({
      valid: true,
      user: {
        id: userRecord.id,
        email: email || undefined,
      },
    });
  } catch (error) {
    console.error("[invite] Unexpected error validating token", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

