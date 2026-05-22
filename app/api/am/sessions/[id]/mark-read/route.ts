import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { markIncomingMessagesRead } from "@/lib/db/messages";

// AM marks buyer (sender_type='user') messages as read on a session
// they've claimed. RLS policy `chat_messages_mark_read_am` enforces
// AM role + assigned_am_user_id = caller.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  try {
    const updated = await markIncomingMessagesRead(supabase, id);
    return NextResponse.json({ updated_ids: updated });
  } catch (e) {
    console.error("am mark-read failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
