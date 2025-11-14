import { Metadata } from "next";
import Link from "next/link";
import { StudentDashboardShell } from "@/components/student/dashboard-shell";
import { publicRoutes } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Student Dashboard",
};

type StudentPageProps = {
  params: { tenantSlug: string };
};

export default function StudentDashboard({ params }: StudentPageProps) {
  const { tenantSlug } = params;

  return (
    <StudentDashboardShell>
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          {tenantSlug}.platform.com
        </p>
        <h1 className="text-3xl font-semibold">Student Dashboard</h1>
        <p className="text-muted-foreground max-w-2xl">
          This route group will surface course progress, announcements, and
          Telegram login state for the {tenantSlug} tenant. Replace this stub
          with student UI once data models are ready.
        </p>
      </header>

      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-medium">Next steps</h2>
        <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
          <li>Bootstrap TanStack Query for Supabase data fetching.</li>
          <li>Integrate Telegram session polling via `useTelegramLogin`.</li>
          <li>Add course catalog and video player components.</li>
        </ul>
      </div>

      <footer className="text-sm text-muted-foreground">
        <Link href={publicRoutes.home}>Return to public site</Link>
      </footer>
    </StudentDashboardShell>
  );
}
