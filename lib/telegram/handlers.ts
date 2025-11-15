import { Context } from "telegraf";
import { getBot } from "@/lib/telegram/bot";
import { getServerSupabaseClient } from "@/lib/auth";
import { isValidNonce } from "@/lib/auth/nonce";
import { logAuthEvent } from "@/lib/auth/audit";

const APP_DOMAIN =
  process.env.NEXT_PUBLIC_APP_DOMAIN || "http://localhost:3000";
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";

/**
 * Validate nonce and get tenant info
 */
async function validateNonce(nonce: string) {
  if (!isValidNonce(nonce)) {
    return null;
  }

  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from("login_nonces")
    .select("id, tenant_id, expires_at, consumed_at, redirect_path")
    .eq("nonce", nonce)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const now = new Date();
  if (data.consumed_at || new Date(data.expires_at) < now) {
    return null;
  }

  // Get tenant info for display
  const { data: tenant } = await supabase
    .from("tenants")
    .select("subdomain, branding")
    .eq("id", data.tenant_id)
    .maybeSingle();

  return {
    nonceRecord: data,
    tenant: tenant || null,
  };
}

/**
 * Handle /start command with nonce
 */
export function setupStartCommand() {
  const bot = getBot();

  bot.start(async (ctx: Context) => {
    const messageText = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = messageText.split(" ");
    const startParam = parts.length > 1 ? parts[1] : null; // Get nonce from /start <nonce>

    if (!startParam) {
      await ctx.reply(
        "👋 Welcome! To sign in, please use the login link from your course platform.",
      );
      return;
    }

    const nonce = startParam.trim();
    const validation = await validateNonce(nonce);

    if (!validation) {
      await ctx.reply(
        "❌ Invalid or expired login link. Please request a new one from your course platform.",
      );
      return;
    }

    const { nonceRecord, tenant } = validation;
    const tenantName =
      (tenant?.branding as { name?: string })?.name ||
      tenant?.subdomain ||
      "the platform";
    const subdomain = tenant?.subdomain || "unknown";
    const platformUrl = `https://${subdomain}.${ROOT_DOMAIN}`;

    // Send confirmation message with approval button
    await ctx.reply(
      `🔐 Sign in to ${tenantName}\n\n` +
        `Platform: ${platformUrl}\n\n` +
        `Tap the button below to approve this login:`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Approve Login",
                callback_data: `approve:${nonce}`,
              },
            ],
            [
              {
                text: "❌ Cancel",
                callback_data: `cancel:${nonce}`,
              },
            ],
          ],
        },
      },
    );
  });
}

/**
 * Handle approval/cancel button callbacks
 */
export function setupCallbackHandlers() {
  const bot = getBot();

  bot.action(/^approve:(.+)$/, async (ctx: Context) => {
    const match = ctx.match;
    if (!match || !Array.isArray(match) || match.length < 2) {
      await ctx.answerCbQuery("Error: Invalid request.");
      return;
    }

    const nonce = match[1];
    const telegramUserId = ctx.from?.id;
    const telegramUsername = ctx.from?.username;

    if (!telegramUserId) {
      await ctx.answerCbQuery(
        "Error: Could not identify your Telegram account.",
      );
      return;
    }

    // Validate nonce again
    const validation = await validateNonce(nonce);
    if (!validation) {
      await ctx.answerCbQuery(
        "This login link has expired. Please request a new one.",
      );
      try {
        await ctx.editMessageText(
          "❌ Login link expired. Please request a new one from your course platform.",
        );
      } catch (editError) {
        // Message might already be edited, ignore
        console.warn("[telegram] Failed to edit message", editError);
      }
      return;
    }

    const { nonceRecord } = validation;

    // Call backend callback API
    try {
      // Construct callback URL with proper protocol
      let callbackUrl: string;
      if (APP_DOMAIN.startsWith("http://") || APP_DOMAIN.startsWith("https://")) {
        callbackUrl = `${APP_DOMAIN}/api/auth/telegram/callback`;
      } else if (APP_DOMAIN.includes("localhost")) {
        // Use http for localhost
        callbackUrl = `http://${APP_DOMAIN}/api/auth/telegram/callback`;
      } else {
        // Use https for production
        callbackUrl = `https://${APP_DOMAIN}/api/auth/telegram/callback`;
      }

      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nonce,
          tenantId: nonceRecord.tenant_id,
          telegramUserId,
          telegramUsername: telegramUsername || undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        await logAuthEvent({
          tenantId: nonceRecord.tenant_id,
          action: "telegram_login_failure",
          resourceType: "login_nonce",
          resourceId: nonceRecord.id,
          payload: {
            telegram_user_id: telegramUserId,
            telegram_username: telegramUsername,
            nonce,
            error: errorText,
            error_code: "callback_api_failed",
          },
        });
        throw new Error(`Callback failed: ${response.status} ${errorText}`);
      }

      // Log successful bot approval
      await logAuthEvent({
        tenantId: nonceRecord.tenant_id,
        action: "telegram_bot_approval",
        resourceType: "login_nonce",
        resourceId: nonceRecord.id,
        payload: {
          telegram_user_id: telegramUserId,
          telegram_username: telegramUsername,
          nonce,
        },
      });

      await ctx.answerCbQuery("✅ Login approved! You can now return to your browser.");
      try {
        await ctx.editMessageText(
          "✅ Login successful!\n\n" +
            "You can now return to your browser and access your courses.",
        );
      } catch (editError) {
        // Message might already be edited, ignore
        console.warn("[telegram] Failed to edit message after approval", editError);
      }
    } catch (error) {
      console.error("[telegram] Callback error", error);
      await ctx.answerCbQuery("Error approving login. Please try again.");
      try {
        await ctx.editMessageText(
          "❌ Failed to approve login. Please try requesting a new login link.",
        );
      } catch (editError) {
        // Message might already be edited, ignore
        console.warn("[telegram] Failed to edit error message", editError);
      }
    }
  });

  bot.action(/^cancel:(.+)$/, async (ctx: Context) => {
    const match = ctx.match;
    if (!match || !Array.isArray(match) || match.length < 2) {
      await ctx.answerCbQuery("Error: Invalid request.");
      return;
    }

    const nonce = match[1];
    const telegramUserId = ctx.from?.id;
    const telegramUsername = ctx.from?.username;

    // Validate nonce to get tenant info for logging
    const validation = await validateNonce(nonce);
    if (validation) {
      await logAuthEvent({
        tenantId: validation.nonceRecord.tenant_id,
        action: "telegram_login_cancelled",
        resourceType: "login_nonce",
        resourceId: validation.nonceRecord.id,
        payload: {
          telegram_user_id: telegramUserId,
          telegram_username: telegramUsername,
          nonce,
        },
      });
    }

    await ctx.answerCbQuery("Login cancelled.");
    try {
      await ctx.editMessageText("❌ Login cancelled.");
    } catch (editError) {
      // Message might already be edited, ignore
      console.warn("[telegram] Failed to edit cancel message", editError);
    }
  });
}

/**
 * Initialize all bot handlers
 */
export function initializeBotHandlers() {
  setupStartCommand();
  setupCallbackHandlers();
}

