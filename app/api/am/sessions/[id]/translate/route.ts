import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listMessages, cacheMessageTranslation } from "@/lib/db/messages";
import { getSession } from "@/lib/db/sessions";
import { translateText } from "@/lib/translate";
import { checkRateLimit, rateLimited429 } from "@/lib/rateLimit";

// Languages an AM can pick to read the thread in. Buyers can be in many
// languages, but the AM team works in these two for now (see the selector
// in app/dashboard/page.tsx). Anything else is rejected so a typo'd code
// can't fan out into a pile of pointless Gemini calls.
const AM_DISPLAY_LANGUAGES = new Set(["zh", "hi"]);

// Translate uncached messages a few at a time so a long thread's first
// open doesn't open dozens of simultaneous backend calls.
const CHUNK = 8;

interface PostBody {
  language?: string;
}

function cachedTranslation(
  metadata: Record<string, unknown> | null | undefined,
  lang: string,
): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const translations = (metadata as { translations?: Record<string, string> })
    .translations;
  const value = translations?.[lang];
  return typeof value === "string" && value ? value : undefined;
}

// AM dashboard: render a session's transcript in the AM's chosen working
// language. For each message we either return a cached translation, do a
// one-shot Gemini translation (and cache it forever in
// metadata.translations), or skip it because the source is already in the
// target language. Each (message, language) pair is translated at most
// once across the lifetime of the thread.
//
// Response: { language, translations: { [messageId]: string } } — only
// non-empty translations. The client treats every loaded message id NOT
// present here as "resolved, show the original only" so it won't re-ask.
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
  const language = typeof body.language === "string" ? body.language : "";
  if (!AM_DISPLAY_LANGUAGES.has(language)) {
    return NextResponse.json(
      { error: "Unsupported display language" },
      { status: 400 },
    );
  }

  // Each uncached message may trigger a paid Gemini call, so bound how
  // fast an AM can fan these out. Generous — opening a few briefs and
  // toggling between Chinese/Hindi stays well under the limit because
  // translations are cached after the first pass.
  const limit = await checkRateLimit(
    `am-translate:user:${gate.userId}`,
    60,
    60,
  );
  if (!limit.allowed) return rateLimited429(limit);

  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const sessionLanguage = session.language ?? "en";
  const messages = await listMessages(supabase, id);

  const result: Record<string, string> = {};
  const admin = getSupabaseAdmin();

  // Decide what actually needs a Gemini call. Cached → surface it; source
  // already in the target language → skip; otherwise translate.
  const toTranslate = messages.filter((m) => {
    if (m.sender_type === "system") return false; // dividers, not chat
    const content = (m.content ?? "").trim();
    if (!content) return false;

    const cached = cachedTranslation(m.metadata, language);
    if (cached !== undefined) {
      result[m.id] = cached;
      return false;
    }
    // user / ai messages are authored in the buyer's session language. If
    // that's already the AM's target, the original IS the translation.
    if (
      (m.sender_type === "user" || m.sender_type === "ai") &&
      sessionLanguage === language
    ) {
      return false;
    }
    return true;
  });

  for (let i = 0; i < toTranslate.length; i += CHUNK) {
    const chunk = toTranslate.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (m) => {
        const translated = await translateText(m.content, language);
        const trimmed = translated?.trim();
        // Skip no-ops (model echoed the input — e.g. the AM already typed
        // in `language`): no secondary line needed, nothing to cache.
        if (!trimmed || trimmed === m.content.trim()) return;
        result[m.id] = translated as string;
        await cacheMessageTranslation(
          admin,
          m.id,
          m.metadata,
          language,
          translated as string,
        );
      }),
    );
  }

  return NextResponse.json({ language, translations: result });
}
