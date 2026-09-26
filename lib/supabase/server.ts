import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS. Only import this from API routes
// (app/api/**), never from a client component.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server env vars are not set");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
