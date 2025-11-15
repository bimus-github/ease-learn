import { cookies } from "next/headers";
import { createHash } from "crypto";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  createClient as createSupabaseJsClient,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { teacherRoutes, publicRoutes } from "@/constants/routes";
import { logAuthEvent, extractRequestMetadata } from "@/lib/auth/audit";
import type { NextRequest } from "next/server";

type UpsertTelegramStudentArgs = {
  nonce: string;
  telegramUserId: number;
  telegramUsername?: string;
  tenantId: string;
  supabase?: SupabaseClient;
  request?: NextRequest;
};

type UpsertTelegramStudentResult = {
  userId: string;
  session: Session;
  redirectPath: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const TELEGRAM_EMAIL_DOMAIN =
  process.env.TELEGRAM_STUDENT_EMAIL_DOMAIN ??
  `students.${sanitizeDomain(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost")}`;

const TELEGRAM_PASSWORD_SECRET =
  process.env.TELEGRAM_STUDENT_PASSWORD_SECRET ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function getServerSupabaseClient() {
  return createServerClient();
}

export function getBrowserSupabaseClient() {
  return createBrowserClient();
}

export async function getServerSession(): Promise<Session | null> {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("[auth] getServerSession error", error);
    return null;
  }
  return data.session ?? null;
}

export async function signOutServerSession() {
  const supabase = await getServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth] error signing out", error);
  }
}

export async function upsertTelegramStudent({
  nonce,
  telegramUserId,
  telegramUsername,
  tenantId,
  supabase,
  request,
}: UpsertTelegramStudentArgs): Promise<UpsertTelegramStudentResult | null> {
  const requestMetadata = request ? extractRequestMetadata(request) : {};

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth] Missing Supabase URL or anon key");
    await logAuthEvent({
      tenantId,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      // Don't set resourceId - nonce string is not a UUID
      payload: {
        ...requestMetadata,
        telegram_user_id: telegramUserId,
        nonce,
        error: "Missing Supabase configuration",
      },
    });
    return null;
  }

  if (!TELEGRAM_PASSWORD_SECRET) {
    console.error(
      "[auth] TELEGRAM_STUDENT_PASSWORD_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured",
    );
    await logAuthEvent({
      tenantId,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      // Don't set resourceId - nonce string is not a UUID
      payload: {
        ...requestMetadata,
        telegram_user_id: telegramUserId,
        nonce,
        error: "Missing password secret configuration",
      },
    });
    return null;
  }

  const client = supabase ?? (await getServerSupabaseClient());
  const { data: nonceRecord, error } = await client
    .from("login_nonces")
    .select("id, expires_at, consumed_at, redirect_path")
    .eq("nonce", nonce)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    console.error("[auth] nonce lookup failed", error);
    await logAuthEvent({
      tenantId,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      // Don't set resourceId - nonce string is not a UUID
      payload: {
        ...requestMetadata,
        telegram_user_id: telegramUserId,
        nonce,
        error: error.message,
        error_code: "nonce_lookup_failed",
      },
    });
    return null;
  }

  if (!nonceRecord) {
    await logAuthEvent({
      tenantId,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      // Don't set resourceId if we don't have a record - nonce string is not a UUID
      payload: {
        ...requestMetadata,
        telegram_user_id: telegramUserId,
        nonce,
        error: "Nonce not found",
        error_code: "nonce_not_found",
      },
    });
    return null;
  }

  const now = new Date();
  if (nonceRecord.consumed_at || new Date(nonceRecord.expires_at) < now) {
    await logAuthEvent({
      tenantId,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      resourceId: nonceRecord.id,
      payload: {
        ...requestMetadata,
        telegram_user_id: telegramUserId,
        error: "Nonce expired or already consumed",
        error_code: "nonce_expired",
      },
    });
    return null;
  }

  const adminClient = safeGetServiceClient();
  if (!adminClient) {
    return null;
  }

  const studentEmail = buildTelegramStudentEmail(telegramUserId);
  const derivedPassword = deriveTelegramPassword(telegramUserId, tenantId);

  const authUser = await upsertSupabaseAuthUser({
    adminClient,
    email: studentEmail,
    password: derivedPassword,
    telegramUserId,
    telegramUsername,
    tenantId,
  });

  if (!authUser) {
    await logAuthEvent({
      tenantId,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      resourceId: nonceRecord.id,
      payload: {
        ...requestMetadata,
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
        error: "Failed to create/update auth user",
        error_code: "auth_user_creation_failed",
      },
    });
    return null;
  }

  await upsertPlatformUserRecord({
    adminClient,
    authUserId: authUser.id,
    telegramUserId,
    telegramUsername,
    tenantId,
  });

  const passwordClient = createSupabaseJsClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: sessionData, error: sessionError } =
    await passwordClient.auth.signInWithPassword({
      email: studentEmail,
      password: derivedPassword,
    });

  if (sessionError || !sessionData.session) {
    console.error("[auth] Failed to create Supabase session", sessionError);
    await logAuthEvent({
      tenantId,
      actorId: authUser.id,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      resourceId: nonceRecord.id,
      payload: {
        ...requestMetadata,
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
        error: sessionError?.message || "Session creation failed",
        error_code: "session_creation_failed",
      },
    });
    return null;
  }

  const session = sessionData.session;

  const { error: updateError } = await client
    .from("login_nonces")
    .update({
      telegram_user_id: telegramUserId,
      consumed_at: now.toISOString(),
      updated_at: now.toISOString(),
      session_access_token: session.access_token,
      session_refresh_token: session.refresh_token,
      session_expires_at: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
      session_token_type: session.token_type ?? "bearer",
    })
    .eq("id", nonceRecord.id);

  if (updateError) {
    console.error("[auth] nonce update failed", updateError);
    await logAuthEvent({
      tenantId,
      actorId: authUser.id,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      resourceId: nonceRecord.id,
      payload: {
        ...requestMetadata,
        telegram_user_id: telegramUserId,
        error: updateError.message,
        error_code: "nonce_update_failed",
      },
    });
    return null;
  }

  // Log successful login
  await logAuthEvent({
    tenantId,
    actorId: authUser.id,
    action: "telegram_login_success",
    resourceType: "login_nonce",
    resourceId: nonceRecord.id,
    payload: {
      ...requestMetadata,
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
      redirect_path: nonceRecord.redirect_path,
    },
  });

  return {
    userId: authUser.id,
    session,
    redirectPath: nonceRecord.redirect_path ?? null,
  };
}

export async function withTenantSession(tenantId: string) {
  const cookieStore = await cookies();
  cookieStore.set("tenant", tenantId);
}

type RequireTeacherAuthOptions = {
  tenantId?: string | null;
};

export async function requireTeacherAuth(
  options: RequireTeacherAuthOptions = {},
): Promise<
  | { error: "unauthorized"; redirect: string }
  | { error: "invalid-role"; redirect: string }
  | { error: "mfa-not-configured"; redirect: string }
  | { error: "mfa-not-verified"; redirect: string }
  | { error: "user-suspended"; redirect: string }
  | { error: "tenant-not-owned"; redirect: string }
  | { error: "email-not-verified"; redirect: string }
  | {
      session: Session;
      user: User;
      userRecord: {
        role: string;
        tenant_id: string | null;
        tenant_owner_id: string | null;
        status: string;
        mfa_enabled: boolean;
        email_verified: boolean;
      };
    }
> {
  const session = await getServerSession();
  if (!session) {
    return { error: "unauthorized", redirect: teacherRoutes.login } as const;
  }

  const supabase = await getServerSupabaseClient();
  const { data: authUser } = await supabase.auth.getUser();

  if (!authUser.user) {
    return { error: "unauthorized", redirect: teacherRoutes.login } as const;
  }

  // Get user record from users table to check role, MFA status, and email verification
  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select("id, role, tenant_id, tenant_owner_id, status, suspended_at, deleted_at, mfa_enabled, mfa_enabled_at, email_verified, email_verified_at")
    .eq("id", authUser.user.id)
    .maybeSingle();

  if (userError || !userRecord) {
    // User record doesn't exist or error fetching - deny access
    return { error: "unauthorized", redirect: teacherRoutes.login } as const;
  }

  // Check role is 'teacher'
  if (userRecord.role !== "teacher") {
    return {
      error: "invalid-role",
      redirect: teacherRoutes.login,
    } as const;
  }

  // Check user status is 'active'
  if (
    userRecord.status !== "active" ||
    userRecord.suspended_at ||
    userRecord.deleted_at
  ) {
    return {
      error: "user-suspended",
      redirect: teacherRoutes.login,
    } as const;
  }

  // Check email verification
  if (!userRecord.email_verified) {
    return {
      error: "email-not-verified",
      redirect: teacherRoutes.verifyEmail,
    } as const;
  }

  // Check MFA factors exist
  const { data: factors, error: factorsError } = await supabase.auth.mfa.getFactors();

  if (factorsError) {
    console.error("[auth] Error fetching MFA factors", factorsError);
    // If we can't check factors, check the users table flag
    if (!userRecord.mfa_enabled) {
      return {
        error: "mfa-not-configured",
        redirect: teacherRoutes.mfaSetup,
      } as const;
    }
    // If mfa_enabled is true but we can't verify factors, allow access (graceful degradation)
  } else {
    // Check if any active factors exist
    const activeFactors = factors?.totp?.filter((f) => f.status === "verified") ?? [];
    if (activeFactors.length === 0 && !userRecord.mfa_enabled) {
      return {
        error: "mfa-not-configured",
        redirect: teacherRoutes.mfaSetup,
      } as const;
    }
  }

  // Check session claims for MFA verification
  // Supabase includes 'amr' (authentication method reference) in JWT claims
  // Access via session.access_token or getClaims()
  const { data: claimsData } = await supabase.auth.getClaims();
  const amr = claimsData?.claims?.amr as string[] | undefined;
  const hasMfaInSession = amr?.some((method) => method === "mfa") ?? false;

  // If MFA is enabled but session doesn't have MFA verification, require re-authentication
  if (userRecord.mfa_enabled && !hasMfaInSession) {
    return {
      error: "mfa-not-verified",
      redirect: teacherRoutes.login,
    } as const;
  }

  // Check tenant ownership
  // If a specific tenantId is provided, verify the teacher owns it
  if (options.tenantId) {
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, teacher_owner_id, status, deleted_at")
      .eq("id", options.tenantId)
      .maybeSingle();

    if (tenantError || !tenant) {
      return {
        error: "tenant-not-owned",
        redirect: teacherRoutes.login,
      } as const;
    }

    // Verify the teacher owns this tenant
    if (tenant.teacher_owner_id !== authUser.user.id) {
      return {
        error: "tenant-not-owned",
        redirect: teacherRoutes.login,
      } as const;
    }

    // Check tenant is active and not deleted
    if (
      tenant.status !== "active" ||
      tenant.deleted_at
    ) {
      return {
        error: "tenant-not-owned",
        redirect: teacherRoutes.login,
      } as const;
    }
  } else {
    // If no specific tenantId provided, verify teacher owns at least one active tenant
    const { data: ownedTenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id")
      .eq("teacher_owner_id", authUser.user.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(1);

    if (tenantsError || !ownedTenants || ownedTenants.length === 0) {
      return {
        error: "tenant-not-owned",
        redirect: teacherRoutes.login,
      } as const;
    }
  }

  return {
    session,
    user: authUser.user,
    userRecord: {
      role: userRecord.role,
      tenant_id: userRecord.tenant_id,
      tenant_owner_id: userRecord.tenant_owner_id,
      status: userRecord.status,
      mfa_enabled: userRecord.mfa_enabled,
      email_verified: userRecord.email_verified,
    },
  };
}

function sanitizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//i, "").split(":")[0];
}

function buildTelegramStudentEmail(telegramUserId: number) {
  // Replace .localhost with a valid domain format for Supabase
  // Supabase requires valid email domains, so use example.com for localhost
  const emailDomain = TELEGRAM_EMAIL_DOMAIN.replace(/\.localhost$/, ".example.com");
  return `telegram-${telegramUserId}@${emailDomain}`;
}

function deriveTelegramPassword(telegramUserId: number, tenantId: string) {
  // Hash the password components to ensure it's always under 72 bytes (bcrypt limit)
  // and still deterministic (same inputs = same password)
  const input = `tg-${telegramUserId}-${tenantId}-${TELEGRAM_PASSWORD_SECRET}`;
  const hash = createHash("sha256").update(input).digest("hex");
  // Use first 64 characters of hash (bcrypt limit is 72 bytes, hex is 1 byte per char)
  return hash.substring(0, 64);
}

type UpsertAuthUserArgs = {
  adminClient: SupabaseClient;
  email: string;
  password: string;
  tenantId: string;
  telegramUserId: number;
  telegramUsername?: string;
};

async function upsertSupabaseAuthUser({
  adminClient,
  email,
  password,
  tenantId,
  telegramUserId,
  telegramUsername,
}: UpsertAuthUserArgs): Promise<User | null> {
  try {
    // List users and find by email (Supabase admin API doesn't have getUserByEmail)
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error("[auth] Error listing users", listError);
    } else {
      // Find user by email
      const existingUser = usersData?.users?.find((u) => u.email === email);
      
      if (existingUser) {
        const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            user_metadata: {
              ...(existingUser.user_metadata ?? {}),
              telegram_user_id: telegramUserId,
              telegram_username: telegramUsername ?? null,
              tenant_id: tenantId,
            },
            app_metadata: {
              ...(existingUser.app_metadata ?? {}),
              role: "student",
              tenant_id: tenantId,
              auth_provider: "telegram",
            },
          },
        );

        if (updateError) {
          console.error("[auth] Failed to update Telegram user", updateError);
          return null;
        }

        return updatedUser?.user ?? existingUser;
      }
    }
  } catch (err) {
    console.error("[auth] Error fetching Telegram user", err);
  }

  // User doesn't exist, create new one
  try {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername ?? null,
        tenant_id: tenantId,
      },
      app_metadata: {
        role: "student",
        tenant_id: tenantId,
        auth_provider: "telegram",
      },
    });

    if (error) {
      console.error("[auth] Failed to create Telegram user", {
        error: error.message,
        code: error.status,
        email,
        telegramUserId,
      });
      return null;
    }

    if (!data?.user) {
      console.error("[auth] Created user but no user data returned", { email });
      return null;
    }

    return data.user;
  } catch (err) {
    console.error("[auth] Unexpected error creating Telegram user", {
      error: err instanceof Error ? err.message : String(err),
      email,
      telegramUserId,
    });
    return null;
  }
}

type UpsertPlatformUserArgs = {
  adminClient: SupabaseClient;
  authUserId: string;
  tenantId: string;
  telegramUserId: number;
  telegramUsername?: string;
};

async function upsertPlatformUserRecord({
  adminClient,
  authUserId,
  tenantId,
  telegramUserId,
  telegramUsername,
}: UpsertPlatformUserArgs) {
  try {
    const { error } = await adminClient.from("users").upsert(
      {
        id: authUserId,
        role: "student",
        tenant_id: tenantId,
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      console.warn("[auth] Failed to upsert platform user record", error);
    }
  } catch (err) {
    console.warn("[auth] Platform user upsert skipped", err);
  }
}

function safeGetServiceClient() {
  try {
    return getServiceRoleSupabaseClient();
  } catch (error) {
    console.error(error);
    return null;
  }
}

type RequireStudentAuthOptions = {
  tenantId?: string | null;
  tenantSlug?: string | null;
};

export async function requireStudentAuth(
  options: RequireStudentAuthOptions = {},
): Promise<
  | { error: "unauthorized"; redirect: string }
  | { error: "invalid-role"; redirect: string }
  | { error: "tenant-mismatch"; redirect: string }
  | { error: "user-suspended"; redirect: string }
  | { session: Session; user: User; userRecord: { role: string; tenant_id: string | null; status: string } }
> {
  const session = await getServerSession();
  if (!session) {
    return { error: "unauthorized", redirect: publicRoutes.home } as const;
  }

  const supabase = await getServerSupabaseClient();
  const { data: authUser } = await supabase.auth.getUser();

  if (!authUser.user) {
    return { error: "unauthorized", redirect: publicRoutes.home } as const;
  }

  // Get user record from users table to check role and tenant
  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select("id, role, tenant_id, status, suspended_at, deleted_at")
    .eq("id", authUser.user.id)
    .maybeSingle();

  if (userError || !userRecord) {
    // User record doesn't exist or error fetching - deny access
    return { error: "unauthorized", redirect: publicRoutes.home } as const;
  }

  // Check role is 'student'
  if (userRecord.role !== "student") {
    return {
      error: "invalid-role",
      redirect: publicRoutes.home,
    } as const;
  }

  // Check user status is 'active'
  if (
    userRecord.status !== "active" ||
    userRecord.suspended_at ||
    userRecord.deleted_at
  ) {
    return {
      error: "user-suspended",
      redirect: publicRoutes.home,
    } as const;
  }

  // Validate tenant_id if provided
  if (options.tenantId && userRecord.tenant_id !== options.tenantId) {
    return {
      error: "tenant-mismatch",
      redirect: publicRoutes.home,
    } as const;
  }

  return {
    session,
    user: authUser.user,
    userRecord: {
      role: userRecord.role,
      tenant_id: userRecord.tenant_id,
      status: userRecord.status,
    },
  };
}
