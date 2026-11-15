"use client";

import { useEffect } from "react";
import { Check, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROGRESS_EN } from "@/lib/progressStrings";
import {
  SOURCING_STAGES,
  stageIndex,
  type SourcingStage,
  type SourcingStageHistory,
} from "@/lib/sourcingStages";
import type { ChatSessionStatus } from "@/lib/supabase/types";

// Buyer-facing right rail: request title + status pill, the 8-stage
// "Sourcing progress" vertical timeline, and a "Next step" helper card.
// Purely presentational — the page feeds it the bootstrap baseline
// overlaid with live realtime values (see app/chat/page.tsx).
//
// Responsive: inline aside at xl+ (xl, not lg, so ProfileSummaryCard's
// sm:grid-cols-2 isn't squeezed at small desktop widths); below xl it's
// an off-canvas right drawer mirroring ChatSidebar's drawer mechanics,
// opened from an info button in the chat header.

interface SourcingProgressRailProps {
  title: string | null;
  status: ChatSessionStatus;
  sourcingStage: SourcingStage | null;
  sourcingStageHistory: SourcingStageHistory;
  handoffRequestedAt: string | null;
  // Mobile drawer control (ignored at xl+ where the rail is inline).
  open?: boolean;
  onClose?: () => void;
}

// "Today → time, otherwise short date" — matches how a buyer reads a
// fresh timeline ("10:27 AM") vs an older one ("Jul 12").
function formatStageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  try {
    return sameDay
      ? d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString("en", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function SourcingProgressRail({
  title,
  status,
  sourcingStage,
  sourcingStageHistory,
  handoffRequestedAt,
  open = false,
  onClose,
}: SourcingProgressRailProps) {
  // Workspace chrome is English-pinned — only the chat itself and the
  // RFQ card localize (see lib/progressStrings.ts).
  const ps = PROGRESS_EN;
  const currentIdx = stageIndex(sourcingStage);

  // Mobile drawer: Escape closes (same contract as ChatSidebar).
  useEffect(() => {
    if (!open || !onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const pill =
    status === "closed"
      ? { label: ps.statusClosed, className: "bg-ink/10 text-ink-soft ring-1 ring-inset ring-ink/20" }
      : status === "ai"
        ? { label: ps.statusDraft, className: "bg-sheet text-ink-soft ring-1 ring-inset ring-ink/20" }
        : sourcingStage === "delivered"
          ? {
              label: ps.stageShort.delivered,
              className: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-700/30",
            }
          : {
              label: ps.stageShort[sourcingStage ?? "brief_submitted"],
              className: "bg-blueprint/12 text-blueprint ring-1 ring-inset ring-blueprint/30",
            };

  const nextStepBody = sourcingStage
    ? ps.nextStep[sourcingStage]
    : ps.nextStepPre;

  function stageTimestamp(stage: SourcingStage): string | null {
    const iso =
      sourcingStageHistory[stage] ??
      (stage === "brief_submitted" ? handoffRequestedAt : null);
    return iso ? formatStageTime(iso) : null;
  }

  return (
    <>
      {/* Below-xl backdrop for the drawer variant. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm xl:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          // Below xl: off-canvas fixed drawer sliding in from the right.
          "fixed inset-y-0 right-0 z-40 flex h-full w-[85%] max-w-[20rem] flex-col border-l border-rule-strong bg-paper pt-safe pb-safe transition-transform duration-200 ease-out",
          // xl+: inline flex child, always visible, no transform.
          "xl:static xl:w-80 xl:max-w-none xl:shrink-0 xl:translate-x-0 xl:pt-0 xl:pb-0",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-2 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="ph-no-capture type-title text-sm font-bold text-ink">
              {title || ps.untitledRequest}
            </h2>
            <span
              className={cn(
                "type-data mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                pill.className,
              )}
            >
              {pill.label}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={ps.closeAria}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint xl:hidden"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="rounded-none border-[1.5px] border-ink bg-sheet p-4">
            <h3 className="type-data text-xs font-semibold text-ink-soft">
              {ps.sourcingProgress}
            </h3>
            <ol className="mt-3">
              {SOURCING_STAGES.map((s, i) => {
                const done = currentIdx >= 0 && i < currentIdx;
                const isCurrent = i === currentIdx;
                const last = i === SOURCING_STAGES.length - 1;
                const ts = (done || isCurrent) && stageTimestamp(s);
                return (
                  <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
                    {/* Connector line down to the next dot. */}
                    {!last && (
                      <span
                        className={cn(
                          "absolute start-[7px] top-4 bottom-0 w-px",
                          done ? "bg-ink" : "bg-rule-strong",
                        )}
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "relative mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full",
                        done
                          ? "bg-ink text-sheet"
                          : isCurrent
                            ? "border-2 border-ink bg-paint"
                            : "border border-rule-strong bg-sheet",
                      )}
                      aria-hidden
                    >
                      {done && <Check className="h-2 w-2" strokeWidth={3} />}
                      {isCurrent && (
                        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-xs leading-snug",
                          isCurrent
                            ? "font-bold text-ink"
                            : done
                              ? "text-gray-700"
                              : "text-gray-500",
                        )}
                      >
                        {ps.stageLabel[s]}
                      </span>
                      {ts && (
                        <span className="type-data mt-0.5 block text-[11px] text-gray-500">
                          {ts}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-4 flex gap-3 rounded-none border border-rule-strong bg-sheet p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sheet">
              <UserRound className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h3 className="type-data text-xs font-semibold text-ink-soft">
                {ps.nextStepTitle}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {nextStepBody}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
