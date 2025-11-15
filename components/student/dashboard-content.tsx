"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoginPrompt } from "@/components/student/login-prompt";
import { StudentDashboardShell } from "@/components/student/dashboard-shell";
import Link from "next/link";
import { publicRoutes } from "@/constants/routes";
import type { User } from "@supabase/supabase-js";

type DashboardContentProps = {
  tenantSlug: string;
  children?: React.ReactNode;
};

export function DashboardContent({
  tenantSlug,
  children,
}: DashboardContentProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <StudentDashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </StudentDashboardShell>
    );
  }

  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <StudentDashboardShell>
      {children || (
        <>
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              {tenantSlug}.platform.com
            </p>
            <h1 className="text-3xl font-semibold">Student Dashboard</h1>
            <p className="text-muted-foreground max-w-2xl">
              Welcome back! Access your courses, track your progress, and view
              announcements.
            </p>
          </header>

          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-medium">Your Courses</h2>
            <p className="text-sm text-muted-foreground">
              Course content will appear here once you&apos;re enrolled.
            </p>
          </div>

          <footer className="text-sm text-muted-foreground">
            <Link href={publicRoutes.home}>Return to public site</Link>
          </footer>
        </>
      )}
    </StudentDashboardShell>
  );
}

