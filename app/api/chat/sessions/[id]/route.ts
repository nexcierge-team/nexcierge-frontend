import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession } from "@/lib/db/sessions";

// Delete a buyer's chat session. Cascades to chat_messages + rfqs via
// ON DELETE CASCADE foreign keys (see 0002 + 0003 migrations).
//
// Idempotent: 404 if the session doesn't exist or doesn't belong to
// the caller; 204 on success. RLS would block cross-user deletes too,
// but we 404 explicitly for a cleaner client experience.
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

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("session delete failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
