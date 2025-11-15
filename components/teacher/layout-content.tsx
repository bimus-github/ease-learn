"use client";

import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import type { ReactNode } from "react";
import { publicTeacherRoutes } from "@/constants/routes";

type TeacherLayoutContentProps = {
  children: ReactNode;
};

export function TeacherLayoutContent({ children }: TeacherLayoutContentProps) {
  const pathname = usePathname();
  const isPublicRoute = publicTeacherRoutes.some((route) =>
    pathname?.startsWith(route)
  );
  
  // Also allow MFA setup and email verification pages (they handle their own auth checks)
  const isMfaSetupPage = pathname === "/teachers/mfa-setup";
  const isVerifyEmailPage = pathname === "/teachers/verify-email";

  if (isPublicRoute || isMfaSetupPage || isVerifyEmailPage) {
    return <>{children}</>;
  }

  // For protected routes, show the full layout with header
  // Auth check happens in individual pages
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Teacher Console
            </p>
            <h1 className="text-lg font-semibold">Course Management</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">MFA-protected session</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
        {children}
      </main>
    </div>
  );
}

