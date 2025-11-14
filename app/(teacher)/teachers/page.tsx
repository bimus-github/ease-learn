import { redirect } from "next/navigation";
import { teacherRoutes } from "@/constants/routes";

export default function TeachersIndex() {
  redirect(teacherRoutes.dashboard);
}

