"use client";

import type { ReactNode } from "react";

export function SummaryCard({
  title,
  value,
  children,
}: {
  title: string;
  value: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {children ? (
        <div className="mt-2 text-xs text-muted-foreground">{children}</div>
      ) : null}
    </div>
  );
}

