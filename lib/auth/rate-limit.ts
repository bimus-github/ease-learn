import { getServerSupabaseClient } from "@/lib/auth";
import { NextRequest } from "next/server";

/**
 * Rate limiting configuration for nonce creation
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 nonces per minute per IP

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return request.ip ?? "unknown";
}

/**
 * Check if the IP address has exceeded the rate limit for nonce creation
 * @returns true if rate limited, false if allowed
 */
export async function checkNonceRateLimit(
  request: NextRequest,
  tenantId: string,
): Promise<{ rateLimited: boolean; retryAfter?: number }> {
  const ip = getClientIp(request);
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  try {
    const supabase = await getServerSupabaseClient();

    // Count nonces created by this IP for this tenant in the rate limit window
    const { count, error } = await supabase
      .from("login_nonces")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("client_ip", ip)
      .gte("inserted_at", windowStart.toISOString())
      .is("consumed_at", null); // Only count unconsumed nonces

    if (error) {
      console.error("[rate-limit] Error checking rate limit", error);
      // On error, allow the request but log it
      return { rateLimited: false };
    }

    if (count && count >= RATE_LIMIT_MAX_REQUESTS) {
      // Calculate retry after time (seconds until the oldest request in window expires)
      const retryAfter = Math.ceil(
        (RATE_LIMIT_WINDOW_MS - (now.getTime() - windowStart.getTime())) / 1000,
      );
      return { rateLimited: true, retryAfter };
    }

    return { rateLimited: false };
  } catch (error) {
    console.error("[rate-limit] Unexpected error", error);
    // On error, allow the request
    return { rateLimited: false };
  }
}

