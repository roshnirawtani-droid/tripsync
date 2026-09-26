import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import { Trip } from "@/lib/types";

// Trips are addressed publicly by their share_token (the value in the
// /trip/[tripId] URL segment), never by internal uuid.
export async function getTripByToken(
  admin: SupabaseClient,
  shareToken: string
): Promise<Trip | null> {
  const { data, error } = await admin
    .from("trips")
    .select("*")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (error || !data) return null;
  return data as Trip;
}
