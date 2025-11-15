import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient, upsertTelegramStudent } from "@/lib/auth";
import { telegramCallbackSchema } from "@/lib/schemas/login";
import { logAuthEvent, extractRequestMetadata } from "@/lib/auth/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  const parsed = telegramCallbackSchema.safeParse(payload);
  if (!parsed.success) {
    const requestMetadata = extractRequestMetadata(request);
    // Try to extract tenantId from payload if available, even if validation failed
    const payloadTenantId = payload && typeof payload === "object" && "tenantId" in payload
      ? (payload as { tenantId?: string }).tenantId
      : undefined;
    await logAuthEvent({
      tenantId: payloadTenantId,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      payload: {
        ...requestMetadata,
        error: "Invalid payload",
        error_code: "invalid_payload",
        issues: parsed.error.flatten(),
      },
    });
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
    request,
  });

  if (!result) {
    const requestMetadata = extractRequestMetadata(request);
    await logAuthEvent({
      tenantId: parsed.data.tenantId,
      action: "telegram_login_failure",
      resourceType: "login_nonce",
      // Don't set resourceId - nonce string is not a UUID
      payload: {
        ...requestMetadata,
        telegram_user_id: parsed.data.telegramUserId,
        telegram_username: parsed.data.telegramUsername,
        nonce: parsed.data.nonce,
        error: "Nonce invalid or expired",
        error_code: "nonce_invalid",
      },
    });
    return NextResponse.json({ error: "nonce-invalid" }, { status: 400 });
  }

  // Success is already logged in upsertTelegramStudent
  return NextResponse.json({ success: true });
}

