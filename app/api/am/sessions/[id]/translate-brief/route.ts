import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getRfq, cacheRfqTranslation, type RfqTranslationUpdate } from "@/lib/db/rfqs";
import { getSession } from "@/lib/db/sessions";
import { translateText } from "@/lib/translate";
import { checkRateLimit, rateLimited429 } from "@/lib/rateLimit";
import { AM_DISPLAY_LANGUAGES } from "@/lib/amLanguages";

// Translate a few at a time so a brief with a long technical_specifications
// dict doesn't open dozens of simultaneous backend calls. Same value as the
// message-translate route.
const CHUNK = 8;

interface PostBody {
  language?: string;
}

interface TranslationUnit {
  // Top-level scalar field, or "technical_specifications" for a spec value.
  field: "machine_type" | "intended_application" | "additional_notes" | "technical_specifications";
  // Present only for technical_specifications units — the spec key.
  specKey?: string;
  text: string;
}

function cachedTranslation(
  translations: Record<string, unknown> | null | undefined,
  lang: string,
): RfqTranslationUpdate | undefined {
  if (!translations || typeof translations !== "object") return undefined;
  return (translations as Record<string, RfqTranslationUpdate>)[lang];
}

// AM dashboard: render a brief's free-text fields (machine_type,
// intended_application, additional_notes, technical_specifications values)
// in the AM's chosen working language. Enum fields (purchase_timeline,
// new_or_used_preference) and technical_specifications *keys* are
// deliberately excluded — those are resolved via static lookup tables
// (lib/cardStrings.ts), not Gemini, since they're a fixed/structural
// vocabulary rather than conversational text.
//
// Response: { language, translations: { machine_type?, intended_application?,
// additional_notes?, technical_specifications?: Record<string,string> } } —
// only fields that actually needed translation. The client treats any field
// NOT present as "resolved, show the original" so it won't re-ask.
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

  const limit = await checkRateLimit(
    `am-translate-brief:user:${gate.userId}`,
    60,
    60,
  );
  if (!limit.allowed) return rateLimited429(limit);

  const supabase = await getSupabaseServer();
  const [session, rfq] = await Promise.all([
    getSession(supabase, id),
    getRfq(supabase, id),
  ]);
  if (!session || !rfq) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const sessionLanguage = session.language ?? "en";
  const cached = cachedTranslation(rfq.translations, language);

  const result: RfqTranslationUpdate = {};
  const units: TranslationUnit[] = [];

  function considerScalar(
    field: "machine_type" | "intended_application" | "additional_notes",
    text: string,
  ) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const cachedValue = cached?.[field];
    if (cachedValue !== undefined) {
      result[field] = cachedValue;
      return;
    }
    // Free-text profile fields are authored in the buyer's session
    // language — if that's already the AM's target, the original IS
    // the translation.
    if (sessionLanguage === language) return;
    units.push({ field, text: trimmed });
  }

  considerScalar("machine_type", rfq.machine_type);
  considerScalar("intended_application", rfq.intended_application);
  considerScalar("additional_notes", rfq.additional_notes);

  const specs = rfq.technical_specifications ?? {};
  const specUpdates: Record<string, string> = {};
  for (const [key, value] of Object.entries(specs)) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    const cachedValue = cached?.technical_specifications?.[key];
    if (cachedValue !== undefined) {
      specUpdates[key] = cachedValue;
      continue;
    }
    if (sessionLanguage === language) continue;
    units.push({ field: "technical_specifications", specKey: key, text: trimmed });
  }
  if (Object.keys(specUpdates).length > 0) {
    result.technical_specifications = specUpdates;
  }

  const admin = getSupabaseAdmin();
  const toCache: RfqTranslationUpdate = {};

  for (let i = 0; i < units.length; i += CHUNK) {
    const chunk = units.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (unit) => {
        const translated = await translateText(unit.text, language);
        const trimmed = translated?.trim();
        // Skip no-ops (model echoed the input): no field needed, nothing
        // to cache.
        if (!trimmed || trimmed === unit.text) return;
        if (unit.field === "technical_specifications" && unit.specKey) {
          result.technical_specifications = {
            ...(result.technical_specifications ?? {}),
            [unit.specKey]: trimmed,
          };
          toCache.technical_specifications = {
            ...(toCache.technical_specifications ?? {}),
            [unit.specKey]: trimmed,
          };
        } else if (unit.field !== "technical_specifications") {
          result[unit.field] = trimmed;
          toCache[unit.field] = trimmed;
        }
      }),
    );
  }

  if (Object.keys(toCache).length > 0) {
    await cacheRfqTranslation(admin, rfq.id, rfq.translations, language, toCache);
  }

  return NextResponse.json({ language, translations: result });
}
