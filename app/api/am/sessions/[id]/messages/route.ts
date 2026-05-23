import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { insertMessage } from "@/lib/db/messages";
import { getSession } from "@/lib/db/sessions";
import { translateText } from "@/lib/translate";
import { checkRateLimit, rateLimited429 } from "@/lib/rateLimit";

interface PostBody {
  content: string;
}

// AM-side message send. RLS enforces:
//   - sender_user_id = auth.uid()
//   - is_account_manager() = true
//   - chat_session.assigned_am_user_id = auth.uid()
// So a misconfigured client can't post on someone else's brief.
//
// If the buyer has chosen a non-English session language, we translate
// the AM's English text via the FastAPI /translate endpoint and store
// both the original (content) and translation (translated_content)
// alongside the language code (translated_to). The buyer UI picks
// translated_content when translated_to matches their current language.
// On translation failure we still send the English original — silence is
// worse than imperfect localisation.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id } = await ctx.params;

  // Per-AM cap on outbound messages. Each send may trigger a Gemini
  // translation call (paid), so we bound it. 120/min is generous —
  // AMs are humans, not scripts.
  const amLimit = await checkRateLimit(`am-msg:user:${gate.userId}`, 120, 60);
  if (!amLimit.allowed) return rateLimited429(amLimit);

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = body.content?.trim();
  if (!text) {
    return NextResponse.json(
      { error: "content required" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServer();

  // Look up the buyer's chosen language for this session. If we can't
  // read it for any reason, default to no translation rather than
  // blocking the send.
  const session = await getSession(supabase, id);
  const targetLanguage = session?.language ?? "en";

  let translatedContent: string | null = null;
  let translatedTo: string | null = null;
  if (targetLanguage !== "en") {
    translatedContent = await translateText(text, targetLanguage);
    if (translatedContent) translatedTo = targetLanguage;
  }

  try {
    const msg = await insertMessage(supabase, {
      sessionId: id,
      senderType: "account_manager",
      senderUserId: gate.userId,
      content: text,
      translatedContent,
      translatedTo,
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
