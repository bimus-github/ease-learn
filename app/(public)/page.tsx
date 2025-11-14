import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { teacherRoutes, publicRoutes } from "@/constants/routes";

export default function PublicHome() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={publicRoutes.home}>Course Management Platform</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href={teacherRoutes.login} className="hover:underline">
                Teacher Login
              </Link>
            </div>
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <div className="flex flex-col gap-8 items-center text-center">
            <h1 className="text-4xl lg:text-5xl font-bold">
              Course Management Platform
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              A modern platform for teachers to manage courses and students to
              access content via Telegram authentication.
            </p>
          </div>
          <div className="flex flex-col gap-6 px-4">
            <h2 className="font-medium text-xl mb-4">Get Started</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                Teachers: Access the admin portal at{" "}
                <Link href={teacherRoutes.base} className="underline">
                  {teacherRoutes.base}
                </Link>
              </li>
              <li>
                Students: Visit your teacher&apos;s subdomain to access courses
              </li>
            </ul>
          </div>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}

