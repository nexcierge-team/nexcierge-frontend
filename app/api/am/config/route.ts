import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { captureServer } from "@/lib/analytics";
import { bustModelConfigCache } from "@/lib/modelConfig";
import { isValidModel, isValidThinkingLevel } from "@/lib/models";

// App-wide runtime settings — the live Gemini model ids + the pills-thinking
// level (app_settings singleton row, migrations 0015 / 0016). AM-only: model
// selection is an operational control, not buyer-facing. GET returns the
// current row; PUT replaces the settings. The buyer chat path reads the same
// row via getModelConfig() with the service-role client; here we use the AM's
// scoped client so RLS (app_settings_*_am policies) is the real enforcement.
//
// Response shape is shared by both verbs so the Settings pane reuses one type.
// `updater:users(...)` embeds via the single app_settings→users FK (updated_by).
// Auto-detected — no dependency on the generated constraint name.
const SELECT =
  "interview_model, pills_model, translate_model, pills_thinking, " +
  "updated_at, updated_by, updater:users(full_name, email)";

interface UpdaterRow {
  full_name: string | null;
  email: string | null;
}

interface SettingsRow {
  interview_model: string;
  pills_model: string;
  translate_model: string;
  pills_thinking: string;
  updated_at: string | null;
  updated_by: string | null;
  updater: UpdaterRow | UpdaterRow[] | null;
}

// PostgREST can type an embed as an object or a single-element array
// depending on the relationship inference — normalise to a display name.
function updatedByName(row: SettingsRow): string | null {
  const u = Array.isArray(row.updater) ? row.updater[0] : row.updater;
  return u?.full_name || u?.email || null;
}

function toConfig(row: SettingsRow) {
  return {
    interview_model: row.interview_model,
    pills_model: row.pills_model,
    translate_model: row.translate_model,
    pills_thinking: row.pills_thinking,
    updated_at: row.updated_at,
    updated_by_name: updatedByName(row),
  };
}

export async function GET() {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .select(SELECT)
    .eq("id", true)
    .maybeSingle();

  if (error) {
    console.error("app_settings read failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
  if (!data) {
    // The seed insert in 0015 should guarantee a row; treat its absence as a
    // migration gap rather than silently inventing defaults.
    return NextResponse.json({ error: "Settings row missing" }, { status: 500 });
  }

  return NextResponse.json({ config: toConfig(data as unknown as SettingsRow) });
}

interface PutBody {
  interview_model?: unknown;
  pills_model?: unknown;
  translate_model?: unknown;
  pills_thinking?: unknown;
}

export async function PUT(req: Request) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Reject anything not in the curated allowlist — a typo here would reach a
  // live buyer turn as an API error or log NULL-cost telemetry.
  const invalid = (["interview_model", "pills_model", "translate_model"] as const).filter(
    (k) => !isValidModel(body[k]),
  );
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Unknown or missing model for: ${invalid.join(", ")}` },
      { status: 400 },
    );
  }
  if (!isValidThinkingLevel(body.pills_thinking)) {
    return NextResponse.json(
      { error: "pills_thinking must be one of: off, low, medium, high" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .update({
      interview_model: body.interview_model as string,
      pills_model: body.pills_model as string,
      translate_model: body.translate_model as string,
      pills_thinking: body.pills_thinking as string,
      updated_at: new Date().toISOString(),
      updated_by: gate.userId,
    })
    .eq("id", true)
    .select(SELECT)
    .maybeSingle();

  if (error || !data) {
    console.error("app_settings update failed:", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }

  bustModelConfigCache();
  const config = toConfig(data as unknown as SettingsRow);
  captureServer(gate.userId, "model_config_updated", {
    interview_model: config.interview_model,
    pills_model: config.pills_model,
    translate_model: config.translate_model,
    pills_thinking: config.pills_thinking,
  });

  return NextResponse.json({ config });
}
