"use client";

import type { ReactNode } from "react";

export function StudentDashboardShell({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Student Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Shows enrolled courses, playback progress, and announcements sourced
          from Supabase.
        </p>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
