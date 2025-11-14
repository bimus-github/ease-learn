import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const nonce = request.nextUrl.searchParams.get("nonce");

  if (!nonce) {
    return NextResponse.json({ error: "nonce-required" }, { status: 400 });
  }

  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from("login_nonces")
    .select("consumed_at, redirect_path, telegram_user_id")
    .eq("nonce", nonce)
    .maybeSingle();

  if (error) {
    console.error("[telegram] poll failed", error);
    return NextResponse.json({ error: "database-error" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ status: "not-found" }, { status: 404 });
  }

  if (!data.consumed_at) {
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }

  return NextResponse.json({
    status: "ready",
    telegramUserId: data.telegram_user_id,
    redirectPath: data.redirect_path,
  });
}

