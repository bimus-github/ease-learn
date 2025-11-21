import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdminAuth } from "@/lib/auth";
import { adminRoutes } from "@/constants/routes";
import { LogoutButton } from "@/components/logout-button";

type AdminLayoutProps = {
  children: ReactNode;
};

const adminNavigation = [
  { label: "Dashboard", href: adminRoutes.dashboard },
  { label: "Tenants", href: adminRoutes.tenants },
  { label: "Users", href: adminRoutes.users },
  { label: "Settings", href: adminRoutes.settings },
];

export default async function AdminProtectedLayout({
  children,
}: AdminLayoutProps) {
  const authResult = await requireSuperAdminAuth();

  if ("error" in authResult) {
    redirect(authResult.redirect as any);
  }

  const { user } = authResult;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Platform Admin
            </p>
            <h1 className="text-lg font-semibold">Course Management</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Signed in as {user.email ?? "admin"}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <nav className="flex flex-wrap gap-3 text-sm">
          {adminNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border px-4 py-1.5 text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="rounded-lg border bg-background p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}

