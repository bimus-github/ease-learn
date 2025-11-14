import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireStudentAuth } from "@/lib/auth";

type StudentLayoutProps = {
  children: ReactNode;
};

export default async function StudentLayout({ children }: StudentLayoutProps) {
  const authResult = await requireStudentAuth();

  if (authResult.error === "unauthorized") {
    redirect(authResult.redirect);
  }

  return <>{children}</>;
}

