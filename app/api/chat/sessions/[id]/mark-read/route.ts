import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession } from "@/lib/db/sessions";
import { markIncomingMessagesRead } from "@/lib/db/messages";

// Buyer marks incoming (ai / account_manager / system) messages as read
// for the given session. RLS policy `chat_messages_mark_read_buyer`
// enforces ownership; we still guard at the handler level so a 404 is
// surfaced cleanly when the session doesn't belong to the caller.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const auth = await getOrCreateUser();
  if (!auth) {
    return NextResponse.json({ error: "Auth failure" }, { status: 500 });
  }
  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, id);
  if (!session || session.user_id !== auth.userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  try {
    const updated = await markIncomingMessagesRead(supabase, id);
    return NextResponse.json({ updated_ids: updated });
  } catch (e) {
    console.error("mark-read failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
