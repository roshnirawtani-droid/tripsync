import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";

// Every conversation/message route calls this before reading or writing:
// membership is checked against conversation_members here, in our own
// server code, rather than relying on Supabase RLS (the browser never
// talks to Supabase directly in this app - see lib/supabase/server.ts).
export async function isConversationMember(
  admin: SupabaseClient,
  conversationId: string,
  memberId: string
): Promise<boolean> {
  const { data } = await admin
    .from("conversation_members")
    .select("member_id")
    .eq("conversation_id", conversationId)
    .eq("member_id", memberId)
    .maybeSingle();
  return Boolean(data);
}
