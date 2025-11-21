import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTeacherAuth } from "@/lib/auth";
import { teacherRoutes } from "@/constants/routes";
import { MfaSetup } from "@/components/teacher/mfa-setup";

export const metadata = {
  title: "Setup MFA",
  description: "Configure Multi-Factor Authentication for your teacher account",
};

export default async function MfaSetupPage() {
  // Check auth but allow access even if MFA is not configured
  const authResult = await requireTeacherAuth();
  
  // Redirect if unauthorized, invalid role, suspended, tenant not owned, or email not verified
  if (
    "error" in authResult &&
    (authResult.error === "unauthorized" ||
      authResult.error === "invalid-role" ||
      authResult.error === "user-suspended" ||
      authResult.error === "tenant-not-owned" ||
      authResult.error === "email-not-verified")
  ) {
    redirect(authResult.redirect as any);
  }
  
  // If MFA is already configured, redirect to dashboard
  if (!("error" in authResult) && authResult.userRecord.mfa_enabled) {
    redirect(teacherRoutes.dashboard);
  }
  
  // Allow access if MFA is not configured (mfa-not-configured error) or if auth is successful
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Setup Multi-Factor Authentication</CardTitle>
            <CardDescription>
              Secure your teacher account with MFA. You'll need to set this up before accessing the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MfaSetup />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

