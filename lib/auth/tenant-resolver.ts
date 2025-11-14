import { getServerSupabaseClient } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { NextRequest } from "next/server";

/**
 * Resolve tenant_id from request (either from subdomain or explicit tenant_id parameter)
 */
export async function resolveTenantId(
  request: NextRequest,
): Promise<{ tenantId: string | null; tenantSlug: string | null; error?: string }> {
  // First, try to get tenant_id from query params (for explicit requests)
  const tenantIdParam = request.nextUrl.searchParams.get("tenant_id");
  if (tenantIdParam) {
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(tenantIdParam)) {
      return { tenantId: tenantIdParam, tenantSlug: null };
    }
    return {
      tenantId: null,
      tenantSlug: null,
      error: "Invalid tenant_id format",
    };
  }

  // Otherwise, resolve from subdomain
  const tenant = getTenantFromRequest(request);
  if (!tenant.tenantSlug) {
    return {
      tenantId: null,
      tenantSlug: null,
      error: "No tenant subdomain found in request",
    };
  }

  // Look up tenant_id from subdomain
  try {
    const supabase = await getServerSupabaseClient();
    const { data, error } = await supabase
      .from("tenants")
      .select("id, status")
      .eq("subdomain", tenant.tenantSlug)
      .maybeSingle();

    if (error) {
      console.error("[tenant-resolver] Database error", error);
      return {
        tenantId: null,
        tenantSlug: tenant.tenantSlug,
        error: "Database error resolving tenant",
      };
    }

    if (!data) {
      return {
        tenantId: null,
        tenantSlug: tenant.tenantSlug,
        error: `Tenant with subdomain "${tenant.tenantSlug}" not found`,
      };
    }

    // Check if tenant is active
    if (data.status !== "active" && data.status !== "trial") {
      return {
        tenantId: null,
        tenantSlug: tenant.tenantSlug,
        error: `Tenant "${tenant.tenantSlug}" is not active`,
      };
    }

    return { tenantId: data.id, tenantSlug: tenant.tenantSlug };
  } catch (error) {
    console.error("[tenant-resolver] Unexpected error", error);
    return {
      tenantId: null,
      tenantSlug: tenant.tenantSlug,
      error: "Unexpected error resolving tenant",
    };
  }
}

