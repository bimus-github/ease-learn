import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireStudentAuth } from "@/lib/auth";
import { resolveTenantFromHost } from "@/lib/tenant";

type StudentLayoutProps = {
  children: ReactNode;
};

export default async function StudentLayout({ children }: StudentLayoutProps) {
  // Resolve tenant from request headers
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const tenant = resolveTenantFromHost(host);

  // Resolve tenant_id if we have a tenant slug
  let tenantId: string | null = null;
  if (tenant.tenantSlug) {
    const { resolveTenantId } = await import("@/lib/auth/tenant-resolver");
    const { NextRequest } = await import("next/server");
    // Create a minimal request object for tenant resolution
    const request = new NextRequest(`https://${host}`, {
      headers: headersList,
    });
    const tenantResolution = await resolveTenantId(request);
    tenantId = tenantResolution.tenantId;
  }

  const authResult = await requireStudentAuth({
    tenantId,
    tenantSlug: tenant.tenantSlug,
  });

  // If there's an error but we have a tenant slug, don't redirect
  // Instead, let the page component handle showing the login prompt
  // This prevents redirect loops when unauthenticated users visit tenant subdomains
  if ("error" in authResult) {
    // Only redirect if we're NOT on a tenant subdomain (e.g., direct access to /teachername)
    // If we're on a tenant subdomain, let the page show the login UI
    if (!tenant.tenantSlug) {
      redirect(authResult.redirect);
    }
    // Otherwise, continue to render children (which will show login prompt)
  }

  return <>{children}</>;
}

