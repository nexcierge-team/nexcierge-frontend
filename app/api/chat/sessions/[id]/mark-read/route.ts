import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import { markIncomingMessagesRead } from "@/lib/db/messages";

// Buyer marks incoming (ai / account_manager / system) messages as read
// for the given session. RLS policy `chat_messages_mark_read_buyer`
// enforces ownership on the UPDATE itself: a foreign session id simply
// matches zero rows. So there's no separate session lookup here (it was a
// redundant round trip on every call).
//
// The client only calls this when an account-manager message is unread
// (read receipts render under the AM's outgoing bubbles; AI rows never
// show one), so it no longer fires after every AI turn.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const auth = await getUser();
  if (!auth) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const supabase = await getSupabaseServer();
  try {
    const updated = await markIncomingMessagesRead(supabase, id);
    return NextResponse.json({ updated_ids: updated });
  } catch (e) {
    console.error("mark-read failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
