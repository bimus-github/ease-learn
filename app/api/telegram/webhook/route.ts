import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * Validate webhook secret token if configured
 */
function validateWebhookSecret(request: NextRequest): boolean {
  if (!TELEGRAM_WEBHOOK_SECRET) {
    return true; // Skip validation if not configured
  }

  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  return secret === TELEGRAM_WEBHOOK_SECRET;
}

export async function POST(request: NextRequest) {
  // Validate webhook secret
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await request.json();
    const bot = getBot();

    // Handle the update
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram] Webhook error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "telegram-webhook",
    botConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
  });
}

