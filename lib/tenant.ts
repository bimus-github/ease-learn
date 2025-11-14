import { NextRequest } from "next/server";

const FALLBACK_ROOT_DOMAIN = "localhost";

export type TenantResolution = {
  hostname: string;
  tenantSlug: string | null;
  isPrimaryHost: boolean;
};

function stripPort(host?: string | null) {
  if (!host) return "";
  const [domain] = host.split(":");
  return domain?.toLowerCase() ?? "";
}

export function getRootDomain() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? FALLBACK_ROOT_DOMAIN;
}

export function resolveTenantFromHost(hostname: string): TenantResolution {
  const host = stripPort(hostname);
  const rootDomain = getRootDomain();

  if (!host || host === rootDomain) {
    return {
      hostname: host,
      tenantSlug: null,
      isPrimaryHost: true,
    };
  }

  if (host.endsWith(`.${rootDomain}`)) {
    const tenantSlug = host.replace(`.${rootDomain}`, "");
    return {
      hostname: host,
      tenantSlug,
      isPrimaryHost: false,
    };
  }

  return {
    hostname: host,
    tenantSlug: null,
    isPrimaryHost: false,
  };
}

export function getTenantFromRequest(request: NextRequest): TenantResolution {
  const hostHeader = request.headers.get("host");
  return resolveTenantFromHost(hostHeader ?? "");
}

