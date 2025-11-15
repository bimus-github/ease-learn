import { redirect } from "next/navigation";
import { requireTeacherAuth } from "@/lib/auth";
import { SessionManagement } from "@/components/teacher/session-management";

export const metadata = {
  title: "Session Management",
  description: "Manage your active sessions and view MFA status",
};

export default async function SessionsPage() {
  const authResult = await requireTeacherAuth();

  // Handle all error types
  if ("error" in authResult) {
    redirect(authResult.redirect);
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold">Session Management</h2>
        <p className="text-muted-foreground">
          View and manage your active sessions, and check your MFA status.
        </p>
      </header>

      <SessionManagement />
    </section>
  );
}

