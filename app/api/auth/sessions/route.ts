import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/auth";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SessionInfo = {
  id: string;
  current: boolean;
  device?: string;
  ip?: string;
  lastActive?: string;
  createdAt?: string;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current session
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    // Supabase doesn't provide a built-in API to list all sessions
    // We'll return the current session info and MFA status
    // For a full session list, we'd need to track sessions in a database table
    const sessions: SessionInfo[] = [];

    if (currentSession) {
      // Extract device info from user agent
      const userAgent = request.headers.get("user-agent") || "";
      const device = parseUserAgent(userAgent);
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip") || undefined;

      sessions.push({
        id: currentSession.access_token.substring(0, 20) + "...", // Truncated token as ID
        current: true,
        device,
        ip,
        lastActive: new Date().toISOString(),
        createdAt: new Date(currentSession.expires_at ? currentSession.expires_at * 1000 - 3600000 : Date.now()).toISOString(), // Estimate
      });
    }

    // Get MFA status
    const { data: userRecord } = await supabase
      .from("users")
      .select("mfa_enabled, mfa_enabled_at")
      .eq("id", user.id)
      .maybeSingle();

    const { data: factors } = await supabase.auth.mfa.getFactors();

    return NextResponse.json({
      sessions,
      mfa: {
        enabled: userRecord?.mfa_enabled || false,
        enabledAt: userRecord?.mfa_enabled_at || null,
        factors: factors?.totp?.filter((f) => f.status === "verified") || [],
      },
    });
  } catch (error) {
    console.error("[sessions] Error fetching sessions", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function parseUserAgent(userAgent: string): string {
  if (!userAgent) return "Unknown device";

  // Simple user agent parsing
  if (userAgent.includes("Mobile")) {
    if (userAgent.includes("iPhone")) return "iPhone";
    if (userAgent.includes("Android")) return "Android Phone";
    return "Mobile Device";
  }

  if (userAgent.includes("Mac")) return "Mac";
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Linux")) return "Linux";

  return "Desktop";
}

