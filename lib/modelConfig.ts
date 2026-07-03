import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Resolves the three live Gemini model ids from the app_settings singleton
// row (migration 0015) — the dashboard-driven config that supersedes the
// backend's GEMINI_* env vars. The Next.js layer reads this and passes the
// chosen model in each backend request body; the backend falls back to its env
// default for any null field, so the Render vars remain a safety net.
//
// Read on the anonymous buyer chat path, so it uses the service-role client
// (bypasses RLS): model ids are an operational control, never buyer-visible,
// and never leave the server.
//
// SERVER ONLY. Never import into a "use client" file.

export interface ModelConfig {
  interviewModel: string | null;
  pillsModel: string | null;
  translateModel: string | null;
  // Semantic pills thinking level (off|low|medium|high); null → backend "low".
  pillsThinking: string | null;
}

const EMPTY: ModelConfig = {
  interviewModel: null,
  pillsModel: null,
  translateModel: null,
  pillsThinking: null,
};

// Short in-memory cache. The translate route fans out one call per message, so
// reading the row per call would hammer the DB; a warm serverless instance
// reuses this within its lifetime. TTL is small so an AM's model change takes
// effect almost immediately (they save, wait a beat, watch PostHog).
const TTL_MS = 10_000;
let cache: { value: ModelConfig; at: number } | null = null;

// Never throws. On any failure returns all-null (not cached) so callers omit
// the override and the backend uses its env defaults — a config read must
// never break a chat turn or a translation.
export async function getModelConfig(): Promise<ModelConfig> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("app_settings")
      .select("interview_model, pills_model, translate_model, pills_thinking")
      .eq("id", true)
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("model config read failed:", error);
      return EMPTY;
    }
    // The service-role client is untyped (no Database generic), so a
    // column-list select comes back as `never` — cast to the known shape.
    const row = data as unknown as {
      interview_model: string | null;
      pills_model: string | null;
      translate_model: string | null;
      pills_thinking: string | null;
    };
    const value: ModelConfig = {
      interviewModel: row.interview_model ?? null,
      pillsModel: row.pills_model ?? null,
      translateModel: row.translate_model ?? null,
      pillsThinking: row.pills_thinking ?? null,
    };
    cache = { value, at: now };
    return value;
  } catch (e) {
    console.error("model config read threw:", e);
    return EMPTY;
  }
}

// Called by the config PUT so a save is reflected immediately on the same warm
// instance (other instances converge within TTL_MS).
export function bustModelConfigCache(): void {
  cache = null;
}
