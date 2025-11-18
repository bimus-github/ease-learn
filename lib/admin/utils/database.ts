import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { PaginationParams, PaginationResponse, TenantFilters, UserFilters } from "@/lib/admin/types";

/**
 * Internal helper to build pagination parameters
 */
function buildPagination(pagination?: PaginationParams) {
  const page = Math.max(1, pagination?.page ?? 1);
  const limit = Math.min(100, Math.max(1, pagination?.limit ?? 50));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Internal helper to query all tenants with filters and pagination
 */
export async function getAllTenantsQuery(
  filters?: TenantFilters,
  pagination?: PaginationParams
) {
  const supabase = getServiceRoleSupabaseClient();
  const { page, limit, offset } = buildPagination(pagination);

  let query = supabase
    .from("tenants")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply status filter
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  // Apply search filter (subdomain or branding.name)
  if (filters?.search) {
    const searchTerm = filters.search.toLowerCase();
    query = query.or(
      `subdomain.ilike.%${searchTerm}%,branding->>name.ilike.%${searchTerm}%`
    );
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch tenants: ${error.message}`);
  }

  const totalPages = count ? Math.ceil(count / limit) : 0;

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages,
  } as PaginationResponse<typeof data[0]>;
}

/**
 * Internal helper to get a single tenant by ID
 */
export async function getTenantByIdQuery(tenantId: string) {
  const supabase = getServiceRoleSupabaseClient();

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch tenant: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data;
}

/**
 * Internal helper to query all users with filters and pagination
 */
export async function getAllUsersQuery(
  filters?: UserFilters,
  pagination?: PaginationParams
) {
  const supabase = getServiceRoleSupabaseClient();
  const { page, limit, offset } = buildPagination(pagination);

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply role filter
  if (filters?.role) {
    query = query.eq("role", filters.role);
  }

  // Apply status filter
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  // Apply tenant filter
  if (filters?.tenantId) {
    query = query.eq("tenant_id", filters.tenantId);
  }

  // Apply search filter (email, display_name, or telegram_username)
  if (filters?.search) {
    const searchTerm = filters.search.toLowerCase();
    // Note: We'll need to join with auth.users for email search
    // For now, search in display_name and telegram_username
    query = query.or(
      `display_name.ilike.%${searchTerm}%,telegram_username.ilike.%${searchTerm}%`
    );
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  // Fetch emails from auth.users if needed
  if (data && data.length > 0) {
    const userIds = data.map((u) => u.id);
    // Note: We'll enhance this to fetch emails in a future update
    // For now, we return users without email enrichment
  }

  const totalPages = count ? Math.ceil(count / limit) : 0;

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages,
  } as PaginationResponse<typeof data[0]>;
}

/**
 * Internal helper to get a single user by ID
 */
export async function getUserByIdQuery(userId: string) {
  const supabase = getServiceRoleSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Try to get email from auth.users using Admin API
  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.admin.getUserById(userId);

    if (!authError && authUser) {
      return {
        ...data,
        email: authUser.email,
      };
    }
  } catch (err) {
    // Ignore errors fetching email - it's optional enrichment
  }

  return data;
}

