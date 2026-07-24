"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AmBriefStrings } from "@/lib/amBriefStrings";
import {
  SOURCING_STAGES,
  stageIndex,
  type SourcingStage,
  type SourcingStageHistory,
} from "@/lib/sourcingStages";

// English labels for the stage slugs. Slugs must stay in sync with
// SOURCING_STAGES in lib/sourcingStages.ts (which the stage route's
// allowlist and migration 0020's CHECK also mirror).
export function stageLabels(
  chrome: AmBriefStrings,
): Record<SourcingStage, string> {
  return {
    brief_submitted: chrome.stageBriefSubmitted,
    in_review: chrome.stageInReview,
    suppliers_contacted: chrome.stageSuppliersContacted,
    quotes_received: chrome.stageQuotesReceived,
    proposal_negotiation: chrome.stageProposalNegotiation,
    order_production: chrome.stageOrderProduction,
    inspection_logistics: chrome.stageInspectionLogistics,
    delivered: chrome.stageDelivered,
  };
}

// Manual stage control for a claimed brief. Keyed by sessionId in the
// parent so state resets when the AM switches briefs. Every stage other
// than the current one is clickable — moving backwards is a legitimate
// correction, not just an advance. Optimistic: the clicked stage
// highlights immediately and rolls back if the save fails.
export function StageSection({
  stage,
  history,
  chrome,
  onSave,
}: {
  stage: SourcingStage | null;
  history: SourcingStageHistory;
  chrome: AmBriefStrings;
  onSave: (stage: SourcingStage) => Promise<boolean>;
}) {
  const [current, setCurrent] = useState<SourcingStage | null>(stage);
  const [saving, setSaving] = useState<SourcingStage | null>(null);
  const [saveError, setSaveError] = useState(false);
  const labels = stageLabels(chrome);
  const currentIdx = stageIndex(current);

  async function setStage(next: SourcingStage) {
    if (saving || next === current) return;
    const prev = current;
    setCurrent(next);
    setSaving(next);
    setSaveError(false);
    const ok = await onSave(next);
    setSaving(null);
    if (!ok) {
      setCurrent(prev);
      setSaveError(true);
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-gray-500">{chrome.stageHint}</p>
      <ol className="space-y-0.5">
        {SOURCING_STAGES.map((s, i) => {
          const isCurrent = s === current;
          const done = currentIdx >= 0 && i < currentIdx;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => setStage(s)}
                disabled={saving !== null || isCurrent}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                  isCurrent
                    ? "bg-[#DCE8F8]/60 font-medium text-[#0F2747]"
                    : "text-gray-600 hover:bg-gray-50",
                  saving !== null && !isCurrent && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                    done
                      ? "bg-[#0F2747] text-white"
                      : isCurrent
                        ? "border-2 border-[#0F2747] bg-white"
                        : "border border-gray-300 bg-white",
                  )}
                >
                  {saving === s ? (
                    <Loader2
                      className="h-2.5 w-2.5 animate-spin text-[#0F2747]"
                      strokeWidth={2.5}
                    />
                  ) : done ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate">{labels[s]}</span>
                {history[s] && (
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {new Date(history[s]).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {saveError && (
        <p className="text-[11px] text-red-600">{chrome.stageFailed}</p>
      )}
    </div>
  );
}
