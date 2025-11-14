import { cookies } from "next/headers";
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

type UpsertTelegramStudentArgs = {
  nonce: string;
  telegramUserId: number;
  telegramUsername?: string;
  tenantId: string;
  supabase?: SupabaseClient;
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
}: UpsertTelegramStudentArgs): Promise<UpsertTelegramStudentResult | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth] Missing Supabase URL or anon key");
    return null;
  }

  if (!TELEGRAM_PASSWORD_SECRET) {
    console.error(
      "[auth] TELEGRAM_STUDENT_PASSWORD_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured",
    );
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
    return null;
  }

  if (!nonceRecord) {
    return null;
  }

  const now = new Date();
  if (nonceRecord.consumed_at || new Date(nonceRecord.expires_at) < now) {
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
    return null;
  }

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

export async function requireTeacherAuth() {
  const session = await getServerSession();
  if (!session) {
    return { error: "unauthorized", redirect: teacherRoutes.login } as const;
  }

  // TODO: Check user role is 'teacher' and MFA is enabled
  // For now, just check if session exists
  const supabase = await getServerSupabaseClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    return { error: "unauthorized", redirect: teacherRoutes.login } as const;
  }

  return { session, user: user.user } as const;
}

function sanitizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//i, "").split(":")[0];
}

function buildTelegramStudentEmail(telegramUserId: number) {
  return `telegram-${telegramUserId}@${TELEGRAM_EMAIL_DOMAIN}`;
}

function deriveTelegramPassword(telegramUserId: number, tenantId: string) {
  return `tg-${telegramUserId}-${tenantId}-${TELEGRAM_PASSWORD_SECRET}`;
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
    const existing = await adminClient.auth.admin.getUserByEmail(email);
    if (existing.data?.user) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        existing.data.user.id,
        {
          password,
          user_metadata: {
            ...(existing.data.user.user_metadata ?? {}),
            telegram_user_id: telegramUserId,
            telegram_username: telegramUsername ?? null,
            tenant_id: tenantId,
          },
          app_metadata: {
            ...(existing.data.user.app_metadata ?? {}),
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

      return existing.data.user;
    }
  } catch (err) {
    console.error("[auth] Error fetching Telegram user", err);
  }

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

  if (error || !data.user) {
    console.error("[auth] Failed to create Telegram user", error);
    return null;
  }

  return data.user;
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

export async function requireStudentAuth() {
  const session = await getServerSession();
  if (!session) {
    return { error: "unauthorized", redirect: publicRoutes.home } as const;
  }

  // TODO: Check user role is 'student'
  const supabase = await getServerSupabaseClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    return { error: "unauthorized", redirect: publicRoutes.home } as const;
  }

  return { session, user: user.user } as const;
}
