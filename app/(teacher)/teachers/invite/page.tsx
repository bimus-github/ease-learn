import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherInviteForm } from "@/components/teacher/invite-form";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";

type InvitePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams;
  const token = params?.token;

  if (!token) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Invalid Invite</CardTitle>
              <CardDescription>
                This invite link is missing a token.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Please check your email for the correct invite link, or contact
                platform support.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Server-side token validation for better UX
  let tokenValid = true;
  let tokenError: string | null = null;

  try {
    const adminClient = getServiceRoleSupabaseClient();
    const { data: userRecord, error: userError } = await adminClient
      .from("users")
      .select("id, invite_token, invite_token_expires_at, tenant_owner_id")
      .eq("invite_token", token)
      .maybeSingle();

    if (userError || !userRecord) {
      tokenValid = false;
      tokenError = "Invalid invite link";
    } else {
      // Check if expired
      const now = new Date();
      const expiresAt = userRecord.invite_token_expires_at
        ? new Date(userRecord.invite_token_expires_at)
        : null;

      if (expiresAt && expiresAt < now) {
        tokenValid = false;
        tokenError = "This invite link has expired";
      } else if (userRecord.tenant_owner_id) {
        tokenValid = false;
        tokenError = "This invite link has already been used";
      }
    }
  } catch (error) {
    // If validation fails server-side, let client-side handle it
    console.error("[invite] Server-side validation error", error);
  }

  // If token is invalid, show error immediately (client will also validate)
  if (!tokenValid && tokenError) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Invalid Invite</CardTitle>
              <CardDescription>{tokenError}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {tokenError.includes("expired")
                  ? "Please contact platform support to request a new invite link."
                  : tokenError.includes("already been used")
                  ? "This invite has already been accepted. Please log in instead."
                  : "Please check your email for the correct invite link, or contact platform support."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <TeacherInviteForm token={token} />
      </div>
    </div>
  );
}

