import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession } from "@/lib/db/sessions";
import { getRfq, rfqRowToProfile } from "@/lib/db/rfqs";
import { listMessages } from "@/lib/db/messages";

// AM-side hydrate: full transcript + rfq for a specific session. The
// AM may read any in-handoff session (their own claim or unclaimed) —
// enforced by RLS via the `is_account_manager()` clause.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const [rfq, messages] = await Promise.all([
    getRfq(supabase, session.id),
    listMessages(supabase, session.id),
  ]);
  if (!rfq) {
    return NextResponse.json({ error: "Missing rfq" }, { status: 500 });
  }
  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      assigned_am_user_id: session.assigned_am_user_id,
      title: session.title,
      handoff_requested_at: session.handoff_requested_at,
    },
    rfq,
    profile: rfqRowToProfile(rfq),
    messages,
  });
}
