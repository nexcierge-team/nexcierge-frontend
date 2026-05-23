import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/supabase/route";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession, setSessionLanguage } from "@/lib/db/sessions";
import { isSupportedLanguage } from "@/lib/languages";

interface PatchBody {
  language: string;
}

// Update the buyer-selected output language for a chat session. The
// buyer can change this at any time; the new value takes effect on the
// next AI turn and the next translated AM message. Past messages are
// not retroactively re-translated.
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.language || !isSupportedLanguage(body.language)) {
    return NextResponse.json(
      { error: "Unsupported language" },
      { status: 400 },
    );
  }

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
    const updated = await setSessionLanguage(supabase, id, body.language);
    return NextResponse.json({
      language: updated?.language ?? body.language,
    });
  } catch (e) {
    console.error("language update failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
