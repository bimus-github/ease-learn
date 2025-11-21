import Link from "next/link";
import { adminRoutes } from "@/constants/routes";

export const dynamic = "force-dynamic";

const adminSections = [
  {
    title: "Dashboard",
    description: "Platform-wide metrics overview",
    href: adminRoutes.dashboard,
  },
  {
    title: "Tenants",
    description: "Manage tenant lifecycle and status",
    href: adminRoutes.tenants,
  },
  {
    title: "Users",
    description: "Review all users across tenants",
    href: adminRoutes.users,
  },
  {
    title: "Settings",
    description: "Global configuration and tools",
    href: adminRoutes.settings,
  },
];

export default function AdminIndexPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold">Platform Administration</h2>
        <p className="text-muted-foreground">
          Choose a section to begin. Detailed tooling will be added iteratively.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {adminSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-lg border bg-muted/20 p-4 transition hover:border-primary"
          >
            <h3 className="text-xl font-medium">{section.title}</h3>
            <p className="text-sm text-muted-foreground">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

