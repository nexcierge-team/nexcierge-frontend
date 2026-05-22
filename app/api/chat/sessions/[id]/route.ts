import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/db/sessions";

// Delete a buyer's chat session. Cascades to chat_messages + rfqs via
// ON DELETE CASCADE FKs (0002 + 0003).
//
// Ownership: enforced by the user-scoped `getSession` SELECT below
// (which respects RLS). Only after we've confirmed the caller owns the
// row do we use the service-role admin client to actually delete — the
// RLS policies on chat_sessions don't include a DELETE clause, so a
// user-scoped delete would silently match zero rows.
export async function DELETE(
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

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("chat_sessions")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("session delete failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
