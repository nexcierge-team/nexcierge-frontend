import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";

// Claim an unassigned brief. Only updates the row if it's still
// unclaimed (cheap optimistic-concurrency check) — two AMs racing on
// the same brief both succeed at the SDK level, but the second update
// is a no-op and we return the actual owner so the UI can refresh.
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

  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ assigned_am_user_id: gate.userId })
    .eq("id", id)
    .is("assigned_am_user_id", null)
    .select()
    .maybeSingle();

  if (error) {
    console.error("claim failed:", error);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }

  if (!data) {
    // Already claimed by someone else (or doesn't exist).
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("assigned_am_user_id")
      .eq("id", id)
      .maybeSingle();
    return NextResponse.json(
      {
        claimed: false,
        assigned_am_user_id: existing?.assigned_am_user_id ?? null,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ claimed: true, session: data });
}
