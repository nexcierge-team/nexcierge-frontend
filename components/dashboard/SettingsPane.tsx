"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GEMINI_MODELS, PILLS_THINKING_LEVELS } from "@/lib/models";

interface ModelConfigView {
  interview_model: string;
  pills_model: string;
  translate_model: string;
  pills_thinking: string;
  updated_at: string | null;
  updated_by_name: string | null;
}

function ConfigSelect({
  label,
  hint,
  value,
  onChange,
  disabled,
  options,
  showIds = false,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  options: { id: string; label: string }[];
  showIds?: boolean;
}) {
  // If the stored value predates the curated list (e.g. an old env id), keep
  // it selectable so we never silently swap the live value out from under it.
  const known = options.some((o) => o.id === value);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900">{label}</label>
      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      <div className="relative mt-2">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-9 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F2747]/15 disabled:opacity-50"
        >
          {!known && value && (
            <option value={value}>{value} (current — not in list)</option>
          )}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {showIds ? `${o.label} · ${o.id}` : o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          strokeWidth={1.75}
        />
      </div>
    </div>
  );
}

// Global live Gemini model config for buyer chat.
export function SettingsPane({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<ModelConfigView | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [interview, setInterview] = useState("");
  const [pills, setPills] = useState("");
  const [translate, setTranslate] = useState("");
  const [pillsThinking, setPillsThinking] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  function hydrate(c: ModelConfigView) {
    setConfig(c);
    setInterview(c.interview_model);
    setPills(c.pills_model);
    setTranslate(c.translate_model);
    setPillsThinking(c.pills_thinking);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/am/config");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { config: ModelConfigView };
        hydrate(data.config);
      } catch (e) {
        console.error("model config load failed:", e);
        setLoadFailed(true);
      }
    })();
  }, []);

  const dirty =
    !!config &&
    (interview !== config.interview_model ||
      pills !== config.pills_model ||
      translate !== config.translate_model ||
      pillsThinking !== config.pills_thinking);

  async function save() {
    if (saving || !dirty) return;
    setSaving(true);
    setSaveError(null);
    setJustSaved(false);
    try {
      const res = await fetch("/api/am/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_model: interview,
          pills_model: pills,
          translate_model: translate,
          pills_thinking: pillsThinking,
        }),
      });
      const data = (await res.json()) as {
        config?: ModelConfigView;
        error?: string;
      };
      if (!res.ok || !data.config) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      hydrate(data.config);
      setJustSaved(true);
    } catch (e) {
      console.error("model config save failed:", e);
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white/85 px-6 py-4 backdrop-blur-xl">
        <button
          onClick={onBack}
          aria-label="Back to overview"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 md:hidden"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Models</h1>
          <p className="text-xs text-gray-500">
            The live Gemini models for buyer chat. Saving changes them for every
            conversation immediately — compare performance in PostHog.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-xl">
          {loadFailed ? (
            <p className="text-sm text-gray-500">
              Settings couldn&apos;t load. Refresh the page to try again.
            </p>
          ) : config === null ? (
            <p className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              Loading settings…
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs leading-relaxed text-amber-800">
                  Global &amp; live: these apply to <strong>all</strong>{" "}
                  buyer chats, not a sandbox. There&apos;s no per-tester
                  isolation — buyers chat anonymously before a manager is
                  assigned.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                <ConfigSelect
                  label="Interview model"
                  hint="Buyer interview turn + lesson drafting (GEMINI_MODEL)."
                  value={interview}
                  onChange={setInterview}
                  disabled={saving}
                  options={GEMINI_MODELS}
                  showIds
                />
                <ConfigSelect
                  label="Pills model"
                  hint="Quick-reply suggestion pass (GEMINI_PILLS_MODEL)."
                  value={pills}
                  onChange={setPills}
                  disabled={saving}
                  options={GEMINI_MODELS}
                  showIds
                />
                <ConfigSelect
                  label="Pills thinking"
                  hint="Reasoning effort on the pills pass — runs every turn, so higher = more cost + latency. Off/Low are the cheap/fast picks."
                  value={pillsThinking}
                  onChange={setPillsThinking}
                  disabled={saving}
                  options={PILLS_THINKING_LEVELS}
                />
                <ConfigSelect
                  label="Translate model"
                  hint="AM-side language detection + translation (GEMINI_TRANSLATE_MODEL)."
                  value={translate}
                  onChange={setTranslate}
                  disabled={saving}
                  options={GEMINI_MODELS}
                  showIds
                />
              </div>

              <div className="mt-7 flex items-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!dirty || saving}
                  onClick={save}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  {saving ? "Saving…" : "Save"}
                </Button>
                {saveError ? (
                  <span className="text-xs text-red-600">{saveError}</span>
                ) : justSaved && !dirty ? (
                  <span className="text-xs text-emerald-700">Saved.</span>
                ) : null}
              </div>

              {config.updated_at && (
                <p className="mt-4 text-[11px] text-gray-400">
                  Last saved {new Date(config.updated_at).toLocaleString()}
                  {config.updated_by_name ? ` by ${config.updated_by_name}` : ""}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
