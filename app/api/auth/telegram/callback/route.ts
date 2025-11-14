import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient, upsertTelegramStudent } from "@/lib/auth";
import { telegramCallbackSchema } from "@/lib/schemas/login";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  const parsed = telegramCallbackSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid-payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await getServerSupabaseClient();

  const result = await upsertTelegramStudent({
    supabase,
    nonce: parsed.data.nonce,
    tenantId: parsed.data.tenantId,
    telegramUserId: parsed.data.telegramUserId,
    telegramUsername: parsed.data.telegramUsername,
  });

  if (!result) {
    return NextResponse.json({ error: "nonce-invalid" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

