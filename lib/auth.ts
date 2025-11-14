import { cookies } from "next/headers";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { teacherRoutes, publicRoutes } from "@/constants/routes";

type UpsertTelegramStudentArgs = {
  nonce: string;
  telegramUserId: number;
  telegramUsername?: string;
  tenantId: string;
  supabase?: SupabaseClient;
};

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
}: UpsertTelegramStudentArgs) {
  const client = supabase ?? (await getServerSupabaseClient());
  const { data: nonceRecord, error } = await client
    .from("login_nonces")
    .select("id, expires_at, consumed_at")
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

  const { error: updateError } = await client
    .from("login_nonces")
    .update({
      telegram_user_id: telegramUserId,
      consumed_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", nonceRecord.id);

  if (updateError) {
    console.error("[auth] nonce update failed", updateError);
    return null;
  }

  return { consumed: true };
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
