import { redirect } from "next/navigation";
import { getValidTenantInvite } from "@/lib/admin/actions/tenants";
import { TenantOnboardingForm } from "@/components/onboard/tenant-onboarding-form";
import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { publicRoutes } from "@/constants/routes";

type OnboardPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function OnboardPage({ searchParams }: OnboardPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <Alert variant="destructive">
            <AlertTitle>Invalid Invite Link</AlertTitle>
            <AlertDescription>
              <p className="mb-4">
                This invite link is missing a token. Please check your email for the complete invitation link.
              </p>
              <Link
                href={publicRoutes.home}
                className="text-sm text-primary hover:underline"
              >
                Return to homepage
              </Link>
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  const validationResult = await getValidTenantInvite(token);

  if (!validationResult.success) {
    const errorMessages: Record<string, { title: string; message: string }> = {
      not_found: {
        title: "Invite Not Found",
        message:
          "This invite link is invalid or has been removed. Please contact the platform administrator for a new invitation.",
      },
      expired: {
        title: "Invite Expired",
        message:
          "This invite link has expired. Please contact the platform administrator to request a new invitation.",
      },
      claimed: {
        title: "Invite Already Used",
        message:
          "This invite has already been claimed. If you believe this is an error, please contact support.",
      },
      revoked: {
        title: "Invite Revoked",
        message:
          "This invite has been revoked by an administrator. Please contact the platform administrator for assistance.",
      },
    };

    const error = errorMessages[validationResult.error] || errorMessages.not_found;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <Alert variant="destructive">
            <AlertTitle>{error.title}</AlertTitle>
            <AlertDescription>
              <p className="mb-4">{error.message}</p>
              <Link
                href={publicRoutes.home}
                className="text-sm text-primary hover:underline"
              >
                Return to homepage
              </Link>
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  const invite = validationResult.invite;
  const metadata = (invite.metadata ?? {}) as Record<string, unknown>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-2xl p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Welcome to Ease Learn</h1>
          <p className="text-muted-foreground">
            Complete your workspace setup to get started
          </p>
        </div>
        <TenantOnboardingForm
          token={token}
          inviteEmail={invite.email}
          suggestedSubdomain={
            typeof metadata.subdomain === "string"
              ? metadata.subdomain
              : undefined
          }
          planType={
            typeof metadata.plan_type === "string"
              ? (metadata.plan_type as "free" | "trial" | "paid" | "enterprise")
              : undefined
          }
          branding={
            metadata.branding && typeof metadata.branding === "object"
              ? (metadata.branding as Record<string, unknown>)
              : undefined
          }
        />
      </Card>
    </div>
  );
}

