import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function getBaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL is required to create the service role client",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is required to create the service role client",
    );
  }

  return { url, serviceRoleKey };
}

export function getServiceRoleSupabaseClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const { url, serviceRoleKey } = getBaseConfig();

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}


