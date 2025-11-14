import type { ReactNode } from "react";
import { TeacherLayoutContent } from "@/components/teacher/layout-content";

type TeacherLayoutProps = {
  children: ReactNode;
};

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  return <TeacherLayoutContent>{children}</TeacherLayoutContent>;
}

