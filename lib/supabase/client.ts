import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Lazy initialization to avoid errors during build when env vars are not set
let supabaseAdmin: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Missing Supabase environment variables");
    }

    supabaseAdmin = createSupabaseClient(url, key);
  }

  return supabaseAdmin;
}
