import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/auth";
import { generateNonce } from "@/lib/auth/nonce";
import {
  checkNonceRateLimit,
  getClientIp,
} from "@/lib/auth/rate-limit";
import { resolveTenantId } from "@/lib/auth/tenant-resolver";
import { createNonceRequestSchema } from "@/lib/schemas/login";
import { logAuthEvent, extractRequestMetadata } from "@/lib/auth/audit";

export const runtime = "nodejs";

const NONCE_TTL_MINUTES = 2;
const TG_BOT_BASE_LINK =
  process.env.NEXT_PUBLIC_TG_BOT_BASE_LINK || "https://t.me/ease_learn_bot";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const parsed = createNonceRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid-request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Resolve tenant_id from request (subdomain or explicit param)
    const tenantResolution = await resolveTenantId(request);
    if (tenantResolution.error || !tenantResolution.tenantId) {
      return NextResponse.json(
        {
          error: "tenant-not-found",
          message: tenantResolution.error || "Tenant not found",
        },
        { status: 404 },
      );
    }

    const tenantId = tenantResolution.tenantId;

    // Check rate limiting
    const rateLimitResult = await checkNonceRateLimit(request, tenantId);
    if (rateLimitResult.rateLimited) {
      const requestMetadata = extractRequestMetadata(request);
      await logAuthEvent({
        tenantId,
        action: "telegram_login_failure",
        resourceType: "tenant",
        resourceId: tenantId,
        payload: {
          ...requestMetadata,
          error: "Rate limit exceeded",
          error_code: "rate_limit_exceeded",
          rate_limited: true,
          retry_after: rateLimitResult.retryAfter,
        },
      });
      return NextResponse.json(
        {
          error: "rate-limit-exceeded",
          message: "Too many nonce creation requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter ?? 60),
          },
        },
      );
    }

    // Generate secure nonce
    const nonce = generateNonce(32);

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + NONCE_TTL_MINUTES);

    // Get client IP for rate limiting
    const clientIp = getClientIp(request);

    // Store nonce in database
    const supabase = await getServerSupabaseClient();
    const { data, error } = await supabase
      .from("login_nonces")
      .insert({
        tenant_id: tenantId,
        nonce,
        redirect_path: parsed.data.redirectPath ?? null,
        expires_at: expiresAt.toISOString(),
        client_ip: clientIp,
      })
      .select("id, nonce, expires_at")
      .single();

    if (error) {
      console.error("[telegram] Failed to create nonce", error);
      const requestMetadata = extractRequestMetadata(request);
      await logAuthEvent({
        tenantId,
        action: "telegram_login_failure",
        resourceType: "tenant",
        resourceId: tenantId,
        payload: {
          ...requestMetadata,
          error: error.message,
          error_code: "nonce_creation_failed",
        },
      });
      return NextResponse.json(
        { error: "database-error", message: "Failed to create nonce" },
        { status: 500 },
      );
    }

    // Generate Telegram bot deep link
    const botDeepLink = `${TG_BOT_BASE_LINK}?start=${nonce}`;

    // Log login attempt
    const requestMetadata = extractRequestMetadata(request);
    await logAuthEvent({
      tenantId,
      action: "telegram_login_attempt",
      resourceType: "login_nonce",
      resourceId: data.id,
      payload: {
        ...requestMetadata,
        nonce,
        redirect_path: parsed.data.redirectPath,
        tenant_slug: tenantResolution.tenantSlug ?? undefined,
      },
    });

    return NextResponse.json({
      nonce,
      botDeepLink,
      expiresAt: data.expires_at,
      tenantId,
    });
  } catch (error) {
    console.error("[telegram] Unexpected error in start endpoint", error);
    return NextResponse.json(
      { error: "internal-error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

