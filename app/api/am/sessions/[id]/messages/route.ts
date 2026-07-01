import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { insertMessage, listMessages } from "@/lib/db/messages";
import { getSession, setSessionLanguage } from "@/lib/db/sessions";
import { translateText, detectLanguage } from "@/lib/translate";
import { checkRateLimit, rateLimited429 } from "@/lib/rateLimit";
import { validateAttachments } from "@/lib/attachments";
import type { Attachment } from "@/types/chat";

interface PostBody {
  content?: string;
  // Document / media metadata for files the AM already uploaded straight to
  // Storage from the browser. Validated server-side against this session.
  attachments?: unknown;
}

// Only attach the `attachments` key when there are files — text-only sends
// keep the empty-object metadata default (and don't disturb the
// metadata.translations cache the dashboard writes later).
function attachmentsMetadata(
  attachments: Attachment[],
): Record<string, unknown> | undefined {
  return attachments.length > 0 ? { attachments } : undefined;
}

// Detect the buyer's language from their OWN messages in this session.
// We concatenate the buyer's turns (capped) so the classifier sees real
// signal — the whole interview — rather than the (often one-word) opening
// message that first-turn detection used to choke on. Returns 'en' when
// there's no buyer text yet or the classifier can't decide.
async function detectBuyerLanguage(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  sessionId: string,
): Promise<string> {
  const rows = await listMessages(supabase, sessionId);
  const buyerText = rows
    .filter((r) => r.sender_type === "user")
    .map((r) => r.content)
    .join("\n")
    .slice(0, 2000);
  if (!buyerText.trim()) return "en";
  return detectLanguage(buyerText);
}

// AM-side message send. RLS enforces:
//   - sender_user_id = auth.uid()
//   - is_account_manager() = true
//   - chat_session.assigned_am_user_id = auth.uid()
// So a misconfigured client can't post on someone else's brief.
//
// The AM may reply in any language (they pick a working language on the
// dashboard). We always deliver the buyer their chosen language with a
// SINGLE forced translation call into it: the backend echoes the text
// verbatim when it's already in that language, so we store a translation
// only when the result actually differs — no separate language-detection
// round-trip (that halves the latency the AM feels on send). Both the
// original (content) and the translation (translated_content +
// translated_to) are stored; the buyer UI shows translated_content when
// translated_to matches their language. On translation failure we still
// send the original — silence is worse than imperfect localisation.
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
  const text = body.content?.trim() ?? "";
  // Attachment paths are checked to live under THIS session's folder, so a
  // tampered request can't reference another session's files.
  const attachments = validateAttachments(body.attachments, id);
  if (attachments === null) {
    return NextResponse.json({ error: "invalid attachments" }, { status: 400 });
  }
  // A message must carry something — text, files, or both.
  if (!text && attachments.length === 0) {
    return NextResponse.json(
      { error: "content or attachments required" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServer();

  // Resolve the buyer's language for this session. It sits on the 'en'
  // column default until we confidently detect otherwise — the chat route
  // no longer detects on the buyer's (often too-short) first message. So
  // the first time an AM replies we lazily detect from the buyer's
  // accumulated thread text and cache the result, giving later AM replies
  // and the dashboard a target without re-detecting. A genuinely English
  // buyer resolves to 'en' and is re-checked cheaply on each send until a
  // non-en signal appears. If we can't read the session, fall back to no
  // translation rather than blocking the send.
  const session = await getSession(supabase, id);
  let targetLanguage = session?.language ?? "en";
  if (targetLanguage === "en") {
    const detected = await detectBuyerLanguage(supabase, id);
    if (detected !== "en") {
      targetLanguage = detected;
      try {
        // Cache with the service-role client: this is a derived/system
        // value, not a user action, and it must land even on the rare
        // path where the AM isn't the RLS-update owner.
        await setSessionLanguage(getSupabaseAdmin(), id, detected);
      } catch (e) {
        // Best-effort: we still deliver THIS reply in `detected`; the
        // next send will simply detect again.
        console.error("session language cache failed:", e);
      }
    }
  }

  // The buyer must always read the reply in their own language, whatever
  // language the AM typed in. One forced call into the buyer's language
  // covers every buyer (English included): Gemini handles any source and
  // echoes the input verbatim when it's already in the target language, so
  // we store a translation only when it differs. Only the caption is
  // translated — an attachment-only message has no text, so we skip the
  // (paid) Gemini call entirely.
  let translatedContent: string | null = null;
  let translatedTo: string | null = null;
  if (text) {
    const localized = await translateText(text, targetLanguage, {
      force: true,
    });
    if (localized && localized.trim() !== text.trim()) {
      translatedContent = localized;
      translatedTo = targetLanguage;
    }
  }

  try {
    const msg = await insertMessage(supabase, {
      sessionId: id,
      senderType: "account_manager",
      senderUserId: gate.userId,
      content: text,
      translatedContent,
      translatedTo,
      metadata: attachmentsMetadata(attachments),
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
