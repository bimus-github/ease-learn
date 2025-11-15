import type { ReactNode } from "react";
import { TeacherLayoutContent } from "@/components/teacher/layout-content";

type TeacherLayoutProps = {
  children: ReactNode;
};

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  // Individual pages handle their own auth checks via requireTeacherAuth
  // MFA setup page allows access when MFA is not configured
  // Other pages redirect to MFA setup if needed
  return <TeacherLayoutContent>{children}</TeacherLayoutContent>;
}

