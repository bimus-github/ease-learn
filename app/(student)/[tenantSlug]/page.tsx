import { Metadata } from "next";
import { DashboardContent } from "@/components/student/dashboard-content";

export const metadata: Metadata = {
  title: "Student Dashboard",
};

type StudentPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StudentDashboard({ params }: StudentPageProps) {
  const { tenantSlug } = await params;

  return <DashboardContent tenantSlug={tenantSlug} />;
}
