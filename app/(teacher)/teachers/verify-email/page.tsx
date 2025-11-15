import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTeacherAuth } from "@/lib/auth";
import { teacherRoutes } from "@/constants/routes";
import { VerifyEmail } from "@/components/teacher/verify-email";

export const metadata = {
  title: "Verify Email",
  description: "Verify your email address to access the teacher dashboard",
};

export default async function VerifyEmailPage() {
  // Check auth but allow access even if email is not verified
  const authResult = await requireTeacherAuth();

  // Redirect if unauthorized or invalid role
  if (
    authResult.error === "unauthorized" ||
    authResult.error === "invalid-role" ||
    authResult.error === "user-suspended" ||
    authResult.error === "tenant-not-owned"
  ) {
    redirect(authResult.redirect);
  }

  // If email is already verified, redirect to dashboard
  if (!("error" in authResult) && authResult.userRecord.email_verified) {
    redirect(teacherRoutes.dashboard);
  }

  // Allow access if email is not verified (email-not-verified error) or if auth is successful
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Verify Your Email</CardTitle>
            <CardDescription>
              Please verify your email address to access the teacher dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerifyEmail />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

