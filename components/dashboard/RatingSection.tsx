"use client";

import { useState } from "react";
import { GraduationCap, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AmBriefStrings } from "@/lib/amBriefStrings";
import type { LeadQuality, RfqsRow } from "@/lib/supabase/types";

// Which brief areas the AM can flag as wrong/missing. Slugs must stay in
// sync with FIELD_ISSUES in app/api/am/sessions/[id]/rating/route.ts.
function issueOptions(
  chrome: AmBriefStrings,
): { slug: string; label: string }[] {
  return [
    { slug: "machine_type", label: chrome.issueMachineType },
    { slug: "specs", label: chrome.issueSpecs },
    { slug: "quantity", label: chrome.issueQuantity },
    { slug: "delivery", label: chrome.issueDelivery },
    { slug: "timeline", label: chrome.issueTimeline },
    { slug: "contact", label: chrome.issueContact },
  ];
}

// Shared with BriefSummary, which renders the verdict pill inline in
// the "AI brief quality" section heading.
export const QUALITY_CHIP: Record<LeadQuality, string> = {
  qualified: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-800",
  junk: "bg-red-100 text-red-800",
};

// Keyed by rfq.id in the parent so all state resets when the AM switches
// briefs. Two modes: editing (fresh or via Edit) shows the full form;
// rated shows the verdict chip + the Generate-lessons button.
export function RatingSection({
  rfq,
  chrome,
  onSave,
  onGenerate,
}: {
  rfq: RfqsRow;
  chrome: AmBriefStrings;
  onSave: (input: {
    quality: LeadQuality;
    issues: string[];
    notes: string;
  }) => Promise<boolean>;
  onGenerate: () => Promise<number | null>;
}) {
  const [editing, setEditing] = useState(!rfq.lead_quality);
  const [quality, setQuality] = useState<LeadQuality | null>(
    rfq.lead_quality,
  );
  const [issues, setIssues] = useState<Set<string>>(
    () => new Set(rfq.lead_quality_field_issues ?? []),
  );
  const [note, setNote] = useState(rfq.lead_quality_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [genState, setGenState] = useState<"idle" | "running" | "error">(
    "idle",
  );
  const [genCount, setGenCount] = useState<number | null>(null);

  const qualityLabel: Record<LeadQuality, string> = {
    qualified: chrome.qualityQualified,
    partial: chrome.qualityPartial,
    junk: chrome.qualityJunk,
  };

  function toggleIssue(slug: string) {
    setIssues((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function save() {
    if (!quality || saving) return;
    setSaving(true);
    setSaveError(false);
    const ok = await onSave({
      quality,
      issues: [...issues],
      notes: note.trim(),
    });
    setSaving(false);
    if (ok) setEditing(false);
    else setSaveError(true);
  }

  async function generate() {
    if (genState === "running") return;
    setGenState("running");
    setGenCount(null);
    const count = await onGenerate();
    if (count === null) {
      setGenState("error");
    } else {
      setGenState("idle");
      setGenCount(count);
    }
  }

  // Rated + not editing: calm summary. The verdict pill itself renders
  // in the section heading (BriefSummary), so this is just the flagged
  // issues, the note, and the follow-up actions.
  if (!editing && rfq.lead_quality) {
    return (
      <div className="space-y-2.5">
        {rfq.lead_quality_field_issues.length > 0 && (
          <p className="text-xs text-gray-500">
            {issueOptions(chrome)
              .filter((o) => rfq.lead_quality_field_issues.includes(o.slug))
              .map((o) => o.label)
              .join(", ")}
          </p>
        )}
        {rfq.lead_quality_notes && (
          <p className="text-xs italic text-gray-500">
            {rfq.lead_quality_notes}
          </p>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          onClick={generate}
          disabled={genState === "running"}
        >
          {genState === "running" ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
              {chrome.generatingLessons}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.75} />
              {chrome.generateLessons}
            </span>
          )}
        </Button>
        {genState === "error" && (
          <p className="text-[11px] text-red-600">{chrome.lessonsFailed}</p>
        )}
        {genCount !== null &&
          (genCount > 0 ? (
            <p className="text-[11px] text-emerald-700">
              {genCount} {chrome.lessonsProposedSuffix}
            </p>
          ) : (
            <p className="text-[11px] text-gray-500">
              {chrome.noLessonsProposed}
            </p>
          ))}
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-[11px] text-gray-400 transition-colors hover:text-gray-700"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.75} />
          {chrome.editRating}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <p className="text-xs text-gray-500">{chrome.ratingQuestion}</p>
      <div className="flex gap-1.5">
        {(["qualified", "partial", "junk"] as LeadQuality[]).map((q) => (
          <button
            key={q}
            onClick={() => setQuality(q)}
            className={cn(
              "flex-1 rounded-full border px-2 py-1.5 text-xs font-medium transition-colors",
              quality === q
                ? cn("border-transparent", QUALITY_CHIP[q])
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            {qualityLabel[q]}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs text-gray-500">
          {chrome.issuesQuestion}
        </p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          {issueOptions(chrome).map((o) => (
            <label
              key={o.slug}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-700"
            >
              <input
                type="checkbox"
                checked={issues.has(o.slug)}
                onChange={() => toggleIssue(o.slug)}
                className="h-3.5 w-3.5 rounded border-gray-300 accent-[#0F2747]"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-gray-500">{chrome.noteLabel}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={chrome.notePlaceholder}
          rows={2}
          maxLength={2000}
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F2747]/15"
        />
      </div>
      <Button
        size="sm"
        variant="primary"
        className="w-full"
        onClick={save}
        disabled={!quality || saving}
      >
        {saving ? chrome.savingRating : chrome.saveRating}
      </Button>
      {saveError && (
        <p className="text-[11px] text-red-600">{chrome.ratingFailed}</p>
      )}
    </div>
  );
}
