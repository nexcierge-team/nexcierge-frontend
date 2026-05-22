import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { insertMessage } from "@/lib/db/messages";

interface PostBody {
  content: string;
}

// AM-side message send. RLS enforces:
//   - sender_user_id = auth.uid()
//   - is_account_manager() = true
//   - chat_session.assigned_am_user_id = auth.uid()
// So a misconfigured client can't post on someone else's brief.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id } = await ctx.params;

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "content required" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServer();
  try {
    const msg = await insertMessage(supabase, {
      sessionId: id,
      senderType: "account_manager",
      senderUserId: gate.userId,
      content: body.content.trim(),
    });
    return NextResponse.json({ message: msg });
  } catch (e) {
    console.error("am message insert failed:", e);
    return NextResponse.json(
      { error: "Insert failed (claim the brief first?)" },
      { status: 403 },
    );
  }
}
