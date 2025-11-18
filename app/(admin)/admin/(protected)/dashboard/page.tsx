import type { ReactNode } from "react";
import { SummaryCard } from "@/components/teacher/summary-card";
import { getAllTenants } from "@/lib/admin/actions/tenants";
import { getAllUsers } from "@/lib/admin/actions/users";

type DashboardSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function DashboardSection({ title, description, children }: DashboardSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

type CardGridProps = {
  cards: { title: string; value: string; description: string }[];
  columns?: string;
};

function CardGrid({ cards, columns = "md:grid-cols-3" }: CardGridProps) {
  return (
    <div className={`grid gap-4 ${columns}`}>
      {cards.map((card) => (
        <SummaryCard key={card.title} title={card.title} value={card.value}>
          {card.description}
        </SummaryCard>
      ))}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [tenantsResult, usersResult] = await Promise.all([
    getAllTenants(),
    getAllUsers(),
  ]);

  const tenants = tenantsResult.success ? tenantsResult.data.items : [];
  const users = usersResult.success ? usersResult.data.items : [];

  // Calculate metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t: any) => t.status === "active").length;
  const suspendedTenants = tenants.filter((t: any) => t.status === "suspended").length;
  const totalUsers = users.length;
  const students = users.filter((u: any) => u.role === "student").length;
  const teachers = users.filter((u: any) => u.role === "teacher").length;
  const platformAdmins = users.filter((u: any) => u.role === "platform_admin").length;
  const mfaEnabledUsers = users.filter((u: any) => u.mfa_enabled).length;
  const mfaEnabledPercentage =
    users.length > 0 ? Math.round((mfaEnabledUsers / users.length) * 100) : 0;

  // Calculate average courses per tenant
  const totalCourses = tenants.reduce(
    (sum: number, t: any) => sum + (t.total_courses_count || 0),
    0,
  );
  const avgCoursesPerTenant = totalTenants > 0 ? Math.round(totalCourses / totalTenants) : 0;

  const platformMetrics = [
    {
      title: "Total Tenants",
      value: String(totalTenants),
      description: "All tenants across the platform.",
    },
    {
      title: "Active Tenants",
      value: String(activeTenants),
      description: "Tenants with active status.",
    },
    {
      title: "Suspended Tenants",
      value: String(suspendedTenants),
      description: "Tenants with suspended status.",
    },
  ];

  const tenantOverview = [
    {
      title: "Average Course Count",
      value: String(avgCoursesPerTenant),
      description: "Avg. published courses per tenant.",
    },
    {
      title: "Suspended Tenants",
      value: String(suspendedTenants),
      description: "Manual suspensions triggered by platform admins.",
    },
  ];

  const userStats = [
    {
      title: "Total Users",
      value: String(totalUsers),
      description: "Combined teacher + student + platform admin accounts.",
    },
    {
      title: "Students",
      value: String(students),
      description: "Student accounts authenticated via Telegram.",
    },
    {
      title: "Teachers",
      value: String(teachers),
      description: "Includes tenant owners and collaborators.",
    },
    {
      title: "Platform Admins",
      value: String(platformAdmins),
      description: "Platform administrators.",
    },
    {
      title: "MFA Enabled",
      value: `${mfaEnabledPercentage}%`,
      description: "Users with verified MFA factors.",
    },
  ];

  const systemHealth = [
    {
      title: "Uptime (30d)",
      value: "99.97%",
      description: "Based on sample monitoring data.",
    },
    {
      title: "Open Incidents",
      value: "0",
      description: "Use this area to link to status page or alerts.",
    },
    {
      title: "Queued Webhooks",
      value: "4",
      description: "Pending Telegram callbacks (placeholder queue).",
    },
  ];

  return (
    <section className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Overview</p>
        <h2 className="text-3xl font-semibold">Platform Dashboard</h2>
        <p className="text-muted-foreground">Platform analytics, health indicators, and usage metrics.</p>
      </header>

      <DashboardSection
        title="Platform Metrics"
        description="High-level snapshot of the entire platform."
      >
        <CardGrid cards={platformMetrics} />
      </DashboardSection>

      <DashboardSection
        title="Tenants Overview"
        description="Operational insight into tenant activity and lifecycle."
      >
        <CardGrid cards={tenantOverview} />
      </DashboardSection>

      <DashboardSection
        title="User Statistics"
        description="Breakdown of teachers, students, and security posture."
      >
        <CardGrid cards={userStats} columns="md:grid-cols-5" />
      </DashboardSection>

      <DashboardSection
        title="System Health"
        description="Monitoring signal placeholders for uptime and alerts."
      >
        <CardGrid cards={systemHealth} columns="md:grid-cols-3" />
      </DashboardSection>
    </section>
  );
}

