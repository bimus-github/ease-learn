import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const nonce = request.nextUrl.searchParams.get("nonce");

  if (!nonce) {
    return NextResponse.json({ error: "nonce-required" }, { status: 400 });
  }

  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from("login_nonces")
    .select(
      "consumed_at, redirect_path, telegram_user_id, session_access_token, session_refresh_token, session_expires_at, session_token_type",
    )
    .eq("nonce", nonce)
    .maybeSingle();

  if (error) {
    console.error("[telegram] poll failed", error);
    return NextResponse.json({ error: "database-error" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ status: "not-found" }, { status: 404 });
  }

  if (
    !data.consumed_at ||
    !data.session_access_token ||
    !data.session_refresh_token
  ) {
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }

  return NextResponse.json({
    status: "ready",
    telegramUserId: data.telegram_user_id,
    redirectPath: data.redirect_path,
    accessToken: data.session_access_token,
    refreshToken: data.session_refresh_token,
    expiresAt: data.session_expires_at,
    tokenType: data.session_token_type ?? "bearer",
  });
}

