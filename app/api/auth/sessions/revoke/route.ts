import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const revokeSessionSchema = z.object({
  sessionId: z.string().optional(),
  revokeAll: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = revokeSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, revokeAll } = parsed.data;
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

    if (!currentSession) {
      return NextResponse.json(
        { error: "No active session" },
        { status: 400 }
      );
    }

    // If revoking current session or all sessions, sign out
    if (revokeAll || !sessionId || sessionId === currentSession.access_token.substring(0, 20) + "...") {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        return NextResponse.json(
          { error: signOutError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: revokeAll ? "All sessions revoked" : "Session revoked",
      });
    }

    // For other sessions, we'd need a session tracking table
    // For now, we can only revoke the current session
    return NextResponse.json(
      { error: "Can only revoke current session. Sign out to end this session." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[sessions] Error revoking session", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

