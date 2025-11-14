import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherInviteForm } from "@/components/teacher/invite-form";

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

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <TeacherInviteForm token={token} />
      </div>
    </div>
  );
}

