import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseService: SupabaseClient | null = null;

export function createSupabaseServiceClient() {
  if (!supabaseService) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase Service Role environment variables.");
    }

    supabaseService = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false, // Server-side doesn't need to refresh tokens
        persistSession: false,   // Server-side shouldn't save session cookies
      },
    });
  }
  return supabaseService;
}