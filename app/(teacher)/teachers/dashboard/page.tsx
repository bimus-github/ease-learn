import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeacherAuth } from "@/lib/auth";
import { SummaryCard } from "@/components/teacher/summary-card";
import { publicRoutes } from "@/constants/routes";

export const metadata = {
  title: "Teacher Dashboard",
};

export default async function TeacherDashboard() {
  const authResult = await requireTeacherAuth();
  
  // Handle all error types
  if ("error" in authResult) {
    redirect(authResult.redirect);
  }
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold">Teacher Dashboard</h2>
        <p className="text-muted-foreground">
          Placeholder for course publishing tools, enrollment management, and
          analytics. Secure with Supabase Auth (email + MFA) before exposing to
          production users.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard title="Enrolled Students" value="—">
          Populate from Supabase views scoped by `tenant_id`.
        </SummaryCard>
        <SummaryCard title="Published Courses" value="—">
          Surface drafts vs published status for quick insight.
        </SummaryCard>
      </div>

      <footer className="text-sm text-muted-foreground">
        <Link href={publicRoutes.home}>Return to public site</Link>
      </footer>
    </section>
  );
}
