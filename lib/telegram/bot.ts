import { Telegraf, Context } from "telegraf";
import { initializeBotHandlers } from "./handlers";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

// Create bot instance
export const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Typing middleware - shows typing indicator on every action
bot.use(async (ctx: Context, next) => {
  try {
    // Show typing action before processing
    if (ctx.chat) {
      await ctx.sendChatAction("typing");
    }
    // Continue to next middleware/handler
    await next();
  } catch (error) {
    console.error("[telegram] Middleware error", error);
    throw error;
  }
});

// Error handler
bot.catch((err, ctx) => {
  console.error("[telegram] Bot error", err);
  ctx.reply("Sorry, something went wrong. Please try again later.").catch(
    (replyError) => {
      console.error("[telegram] Failed to send error message", replyError);
    },
  );
});

// Initialize handlers when module loads
initializeBotHandlers();

export function getBot() {
  return bot;
}

