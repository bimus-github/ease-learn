import { AdminLoginForm } from "@/components/admin/admin-login-form";
import Link from "next/link";

export const metadata = {
  title: "Platform Admin Login",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-16">
      <div className="w-full max-w-4xl rounded-2xl border bg-background shadow-xl lg:grid lg:grid-cols-2">
        <div className="hidden flex-col justify-center border-r bg-primary/5 p-10 lg:flex">
          <p className="text-sm uppercase tracking-wide text-primary">Platform Admin</p>
          <h1 className="mt-4 text-3xl font-semibold">Manage every tenant from one console.</h1>
          <p className="mt-3 text-muted-foreground">
            This portal is reserved for platform operators. Teacher accounts should continue to use{" "}
            <Link href="/teachers/login" className="text-primary underline-offset-4 hover:underline">
              /teachers/login
            </Link>.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>• Configure system-wide settings and feature flags.</li>
            <li>• Review audit trails and session health.</li>
            <li>• Support teacher onboarding and tenant management.</li>
          </ul>
        </div>
        <div className="flex flex-col items-center justify-center p-8">
          <AdminLoginForm />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need access? Contact your platform administrator to be added as a platform_admin user.
          </p>
        </div>
      </div>
    </div>
  );
}

