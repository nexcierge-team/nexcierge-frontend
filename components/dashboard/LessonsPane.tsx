"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentLessonsRow } from "@/lib/supabase/types";

// Machine-drafted improvement lessons awaiting human review. Approve
// (optionally after editing), or reject. English-only chrome, same as
// the inbox — the AM language selector only localizes brief details.
export function LessonsPane({ onBack }: { onBack: () => void }) {
  const [lessons, setLessons] = useState<AgentLessonsRow[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/am/lessons");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { lessons: AgentLessonsRow[] };
        setLessons(data.lessons ?? []);
      } catch (e) {
        console.error("lessons load failed:", e);
        setLoadFailed(true);
      }
    })();
  }, []);

  async function review(
    id: string,
    action: "approve" | "reject",
    editedText?: string,
  ) {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/am/lessons/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(editedText !== undefined ? { lesson_text: editedText } : {}),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { lesson: AgentLessonsRow };
      setLessons((prev) =>
        prev
          ? prev.map((l) => (l.id === id ? data.lesson : l))
          : prev,
      );
      if (editingId === id) setEditingId(null);
    } catch (e) {
      console.error("lesson review failed:", e);
    } finally {
      setBusyId(null);
    }
  }

  const proposed = (lessons ?? []).filter((l) => l.status === "proposed");
  const reviewed = (lessons ?? []).filter((l) => l.status !== "proposed");

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
          <h1 className="text-sm font-semibold text-gray-900">
            Agent lessons
          </h1>
          <p className="text-xs text-gray-500">
            Drafted from your brief ratings. Approved lessons feed the next
            prompt update — nothing changes the agent until you approve.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl">
          {loadFailed ? (
            <p className="text-sm text-gray-500">
              Lessons couldn&apos;t load. Refresh the page to try again.
            </p>
          ) : lessons === null ? (
            <p className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              Loading lessons…
            </p>
          ) : lessons.length === 0 ? (
            <p className="text-sm text-gray-500">
              No lessons yet. Rate a brief, then hit Generate lessons.
            </p>
          ) : (
            <>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Needs review · {proposed.length}
              </div>
              {proposed.length === 0 ? (
                <p className="mb-6 text-xs text-gray-400">
                  Nothing waiting on you.
                </p>
              ) : (
                <ul className="mb-8 space-y-3">
                  {proposed.map((l) => (
                    <li
                      key={l.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                    >
                      {editingId === l.id ? (
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          autoFocus
                          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F2747]/15"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">
                          {l.lesson_text}
                        </p>
                      )}
                      {l.rationale && (
                        <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                          {l.rationale}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        {editingId === l.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={busyId === l.id || !draft.trim()}
                              onClick={() => review(l.id, "approve", draft.trim())}
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={2} />
                              Approve edited
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={busyId === l.id}
                              onClick={() => review(l.id, "approve")}
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={2} />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === l.id}
                              onClick={() => {
                                setEditingId(l.id);
                                setDraft(l.lesson_text);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === l.id}
                              onClick={() => review(l.id, "reject")}
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={2} />
                              Reject
                            </Button>
                          </>
                        )}
                        {busyId === l.id && (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin text-gray-400"
                            strokeWidth={1.75}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {reviewed.length > 0 && (
                <>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Reviewed · {reviewed.length}
                  </div>
                  <ul className="space-y-2">
                    {reviewed.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-start gap-2.5 rounded-lg bg-gray-50 px-3.5 py-2.5"
                      >
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            l.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-200 text-gray-600",
                          )}
                        >
                          {l.status === "approved" ? "Approved" : "Rejected"}
                        </span>
                        <p
                          className={cn(
                            "text-xs leading-relaxed",
                            l.status === "approved"
                              ? "text-gray-700"
                              : "text-gray-400 line-through",
                          )}
                        >
                          {l.lesson_text}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
