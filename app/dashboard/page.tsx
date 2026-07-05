"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  DashboardSidebar,
  type DashboardView,
} from "@/components/dashboard/DashboardSidebar";
import { GateScreen } from "@/components/dashboard/GateScreen";
import { OverviewPane } from "@/components/dashboard/OverviewPane";
import { BriefPane } from "@/components/dashboard/BriefPane";
import { LessonsPane } from "@/components/dashboard/LessonsPane";
import { SettingsPane } from "@/components/dashboard/SettingsPane";
import {
  rowToMessage,
  type InboxBrief,
  type OpenBrief,
} from "@/components/dashboard/types";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { useRealtimeChat } from "@/lib/useRealtimeChat";
import type {
  AgentLessonsRow,
  ChatMessagesRow,
  LeadQuality,
  RfqsRow,
} from "@/lib/supabase/types";
import type { Message } from "@/types/chat";
import {
  isAllowedAttachment,
  humanFileSize,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/attachments";
import {
  uploadAttachment,
  type PendingAttachment,
} from "@/lib/storage/attachments";
import { AM_DISPLAY_LANGUAGES } from "@/lib/amLanguages";

// The dashboard page is the state + data orchestrator: inbox loading,
// the open brief's realtime chat, attachments, translations, rating,
// and navigation between views. All rendering lives in the
// components/dashboard/* modules.
export default function DashboardPage() {
  const [briefs, setBriefs] = useState<InboxBrief[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  // 'anonymous' | 'wrong_role' | 'unknown' — drives the gating UI.
  // `null` means inbox loaded fine.
  const [inboxBlocked, setInboxBlocked] = useState<
    null | "anonymous" | "wrong_role" | "unknown"
  >(null);
  const [open, setOpen] = useState<OpenBrief | null>(null);
  const [openLoading, setOpenLoading] = useState(false);
  // Which main view is showing when no brief is open. An open brief
  // renders on top of (and returns to) the current view.
  const [view, setView] = useState<DashboardView>("overview");
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  // Documents / media the AM has queued for the current reply. Each is
  // uploaded to Storage the moment it's picked; `uploaded` holds the
  // resulting Attachment metadata we POST on send. Cleared on send and on
  // brief switch so files never bleed into the wrong thread.
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const pendingRef = useRef<PendingAttachment[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  // Proposed-lessons count for the sidebar badge + attention card.
  // Purely informational — LessonsPane fetches its own full list.
  const [lessonsCount, setLessonsCount] = useState<number | null>(null);
  // AM's chosen working language for reading the thread. "" = original
  // only. Read straight from localStorage so it persists across briefs.
  // Lazy init (not an effect) is safe from hydration mismatch because the
  // selector only renders once a brief is open — never in the first paint.
  const [amLanguage, setAmLanguageState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const saved = window.localStorage.getItem("nexcierge.am.displayLanguage");
      return saved && AM_DISPLAY_LANGUAGES.has(saved) ? saved : "";
    } catch {
      return "";
    }
  });
  const [amTranslating, setAmTranslating] = useState(false);
  const translatingRef = useRef(false);
  const seenIds = useRef<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  const setAmLanguage = useCallback((lang: string) => {
    setAmLanguageState(lang);
    try {
      if (lang) localStorage.setItem("nexcierge.am.displayLanguage", lang);
      else localStorage.removeItem("nexcierge.am.displayLanguage");
    } catch {
      /* ignore persistence failures */
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open?.messages.length]);

  // Resolve who we are so we can decide "assigned to me" + render
  // outgoing AM bubbles correctly (email feeds the overview greeting).
  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setMeId(user?.id ?? null);
      } catch (e) {
        console.error("user lookup failed:", e);
      }
    })();
  }, []);

  const loadInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/am/inbox", { method: "GET" });
      if (res.status === 401) {
        // Not signed in (or still anonymous). Prompt sign-in.
        setInboxBlocked("anonymous");
        setInboxLoading(false);
        return;
      }
      if (res.status === 403) {
        // Signed in but no AM role. Need an admin to promote.
        setInboxBlocked("wrong_role");
        setInboxLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBriefs(data.briefs ?? []);
      setInboxBlocked(null);
    } catch (e) {
      console.error("inbox fetch failed:", e);
      setInboxBlocked("unknown");
    } finally {
      setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  // Best-effort proposed-lessons count. Never blocks the dashboard.
  const refreshLessonsCount = useCallback(async () => {
    try {
      const res = await fetch("/api/am/lessons");
      if (!res.ok) return;
      const data = (await res.json()) as { lessons: AgentLessonsRow[] };
      setLessonsCount(
        (data.lessons ?? []).filter((l) => l.status === "proposed").length,
      );
    } catch {
      /* informational only */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state lands after the response, not synchronously
    if (!inboxLoading && inboxBlocked === null) void refreshLessonsCount();
  }, [inboxLoading, inboxBlocked, refreshLessonsCount]);

  const openBrief = useCallback(
    async (sessionId: string) => {
      setOpenLoading(true);
      // Drop any files queued against the previously-open brief.
      setPending([]);
      setComposer("");
      try {
        const res = await fetch(
          `/api/am/sessions/${encodeURIComponent(sessionId)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const msgs = (data.messages as ChatMessagesRow[]).map(rowToMessage);
        seenIds.current = new Set(msgs.map((m) => m.id));
        setOpen({
          sessionId,
          assignedToMe: data.session.assigned_am_user_id === meId,
          rfq: data.rfq,
          messages: msgs,
        });
      } catch (e) {
        console.error("brief load failed:", e);
      } finally {
        setOpenLoading(false);
      }
    },
    [meId],
  );

  const closeBrief = useCallback(() => {
    setOpen(null);
    setPending([]);
    setComposer("");
  }, []);

  const navigate = useCallback(
    (next: DashboardView) => {
      setView(next);
      closeBrief();
      // Lessons may have been reviewed/generated since the last count.
      if (next === "overview") void refreshLessonsCount();
    },
    [closeBrief, refreshLessonsCount],
  );

  // Realtime via the shared hook. Both this AM dashboard and the
  // buyer's /chat join the same channel name (`session:<id>`) so
  // postgres-changes AND typing broadcasts reach both sides.
  const handleInsert = useCallback((row: ChatMessagesRow) => {
    if (seenIds.current.has(row.id)) return;
    seenIds.current.add(row.id);
    setOpen((prev) =>
      prev && prev.sessionId === row.chat_session_id
        ? { ...prev, messages: [...prev.messages, rowToMessage(row)] }
        : prev,
    );
  }, []);
  const handleUpdate = useCallback((row: ChatMessagesRow) => {
    setOpen((prev) =>
      prev && prev.sessionId === row.chat_session_id
        ? {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === row.id ? { ...m, readAt: row.read_at } : m,
            ),
          }
        : prev,
    );
  }, []);
  const { otherIsTyping, notifyTyping, notifyStoppedTyping } = useRealtimeChat({
    sessionId: open?.sessionId ?? null,
    myUserId: meId,
    myRole: "account_manager",
    onMessageInsert: handleInsert,
    onMessageUpdate: handleUpdate,
  });

  // AM-side mark-read: mark buyer messages as read whenever the brief
  // is open and we see unread ones.
  useEffect(() => {
    if (!open?.sessionId) return;
    if (typeof document !== "undefined" && document.hidden) return;
    const hasUnread = open.messages.some(
      (m) => m.role === "user" && m.readAt == null,
    );
    if (!hasUnread) return;
    void fetch(
      `/api/am/sessions/${encodeURIComponent(open.sessionId)}/mark-read`,
      { method: "POST" },
    ).catch((e) => console.error("am mark-read failed:", e));
  }, [open?.sessionId, open?.messages]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    function onVisibility() {
      if (document.hidden || !open?.sessionId) return;
      void fetch(
        `/api/am/sessions/${encodeURIComponent(open.sessionId)}/mark-read`,
        { method: "POST" },
      ).catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [open?.sessionId]);

  // Fill in AM-side translations for the open brief whenever the AM has a
  // working language selected and some loaded messages still lack a
  // translation for it. One effect covers initial open, language
  // switches, realtime buyer inserts, and the AM's own sent message —
  // they all land in open.messages. The route is cached + idempotent, so
  // redundant runs do no Gemini work; the in-flight ref avoids overlap.
  useEffect(() => {
    if (!open?.sessionId) return;
    if (!AM_DISPLAY_LANGUAGES.has(amLanguage)) return;
    if (translatingRef.current) return;
    const lang = amLanguage;
    const sessionId = open.sessionId;
    const needed = open.messages.some(
      (m) =>
        m.role !== "divider" &&
        m.content &&
        m.translations?.[lang] === undefined,
    );
    if (!needed) return;
    // Snapshot which messages we're asking about so a message that
    // arrives mid-flight isn't wrongly marked "resolved" by our merge.
    const requestedIds = new Set(open.messages.map((m) => m.id));
    translatingRef.current = true;
    (async () => {
      setAmTranslating(true);
      try {
        const res = await fetch(
          `/api/am/sessions/${encodeURIComponent(sessionId)}/translate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language: lang }),
          },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          language: string;
          translations: Record<string, string>;
        };
        const map = data.translations ?? {};
        setOpen((prev) => {
          if (!prev || prev.sessionId !== sessionId) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) => {
              if (!requestedIds.has(m.id)) return m; // arrived after we asked
              if (m.translations?.[lang] !== undefined) return m;
              return {
                ...m,
                translations: {
                  ...(m.translations ?? {}),
                  // Absent from the map → resolved, show original only.
                  [lang]: map[m.id] ?? "",
                },
              };
            }),
          };
        });
      } catch (e) {
        console.error("am translate fetch failed:", e);
      } finally {
        translatingRef.current = false;
        setAmTranslating(false);
      }
    })();
  }, [open?.sessionId, open?.messages, amLanguage]);

  // Persist the AM's verdict on the AI interview (rating card in the
  // brief sidebar). Returns true on success; the updated rfq (with
  // lead_quality set) replaces the open brief's copy so the card flips
  // to its rated state and the Generate-lessons button unlocks.
  const saveRating = useCallback(
    async (input: {
      quality: LeadQuality;
      issues: string[];
      notes: string;
    }): Promise<boolean> => {
      if (!open) return false;
      const sessionId = open.sessionId;
      try {
        const res = await fetch(
          `/api/am/sessions/${encodeURIComponent(sessionId)}/rating`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lead_quality: input.quality,
              field_issues: input.issues,
              notes: input.notes,
            }),
          },
        );
        if (!res.ok) return false;
        const data = (await res.json()) as { rfq: RfqsRow };
        setOpen((prev) =>
          prev && prev.sessionId === sessionId
            ? { ...prev, rfq: data.rfq }
            : prev,
        );
        return true;
      } catch (e) {
        console.error("rating save failed:", e);
        return false;
      }
    },
    [open],
  );

  // Run the rated transcript through Gemini (backend /draft-lessons via
  // our lessons route). Returns the number of proposed lessons written
  // to agent_lessons, or null on failure.
  const generateLessons = useCallback(async (): Promise<number | null> => {
    if (!open) return null;
    try {
      const res = await fetch(
        `/api/am/sessions/${encodeURIComponent(open.sessionId)}/lessons`,
        { method: "POST" },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { lessons: AgentLessonsRow[] };
      void refreshLessonsCount();
      return data.lessons.length;
    } catch (e) {
      console.error("lesson generation failed:", e);
      return null;
    }
  }, [open, refreshLessonsCount]);

  async function claim() {
    if (!open) return;
    try {
      const res = await fetch(
        `/api/am/sessions/${encodeURIComponent(open.sessionId)}/claim`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok && data.claimed) {
        setOpen({ ...open, assignedToMe: true });
        await loadInbox();
      } else {
        // Someone else got there first — refresh the inbox.
        await loadInbox();
      }
    } catch (e) {
      console.error("claim failed:", e);
    }
  }

  // Keep a ref copy so addFiles can compute remaining slots without
  // depending on (and re-creating on) every pending change.
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Upload one queued file to Storage, flipping its chip from "uploading"
  // to ready (or error). The browser uploads straight to Supabase Storage,
  // so big files don't hit the serverless body limit.
  const runUpload = useCallback(
    async (sessionId: string, entry: PendingAttachment) => {
      try {
        const uploaded = await uploadAttachment(sessionId, entry.file);
        setPending((prev) =>
          prev.map((p) =>
            p.id === entry.id ? { ...p, uploading: false, uploaded } : p,
          ),
        );
      } catch (e) {
        console.error("attachment upload failed:", e);
        setPending((prev) =>
          prev.map((p) =>
            p.id === entry.id
              ? { ...p, uploading: false, error: "Upload failed" }
              : p,
          ),
        );
      }
    },
    [],
  );

  // Validate picked files against the per-message cap, size, and type, then
  // start uploading the valid ones. Rejected files still show as error chips
  // so the AM sees why.
  const addFiles = useCallback(
    (files: File[]) => {
      const sessionId = open?.sessionId;
      if (!sessionId) return;
      const room = Math.max(
        0,
        MAX_ATTACHMENTS_PER_MESSAGE - pendingRef.current.length,
      );
      const accepted: PendingAttachment[] = [];
      for (const file of files.slice(0, room)) {
        let error: string | undefined;
        if (file.size > MAX_ATTACHMENT_BYTES) {
          error = `Too large (max ${humanFileSize(MAX_ATTACHMENT_BYTES)})`;
        } else if (!isAllowedAttachment(file.name)) {
          error = "Unsupported type";
        }
        accepted.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          uploading: !error,
          error,
        });
      }
      if (accepted.length === 0) return;
      setPending((prev) => [...prev, ...accepted]);
      for (const entry of accepted) {
        if (!entry.error) void runUpload(sessionId, entry);
      }
    },
    [open?.sessionId, runUpload],
  );

  const removeAttachment = useCallback((id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }, []);

  async function sendReply() {
    if (!open || sending) return;
    const text = composer.trim();
    // Don't send while an upload is still in flight (the composer also
    // blocks this) and require something to send.
    if (pending.some((p) => p.uploading)) return;
    const ready = pending
      .map((p) => p.uploaded)
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    if (!text && ready.length === 0) return;
    const sessionId = open.sessionId;
    // Snapshot composer state so a failed send can restore it (text + the
    // already-uploaded files) for a one-click retry.
    const snapshotPending = pending;
    setSending(true);
    setComposer("");
    setPending([]);
    notifyStoppedTyping();
    // Render the AM's own message immediately instead of waiting on the
    // server round-trip — that round-trip runs a Gemini translation for the
    // BUYER, which the AM has no reason to block on. Realtime skips our own
    // inserts, so there's nothing to dedupe; we just swap this optimistic
    // bubble for the persisted row (real id + buyer-facing translation)
    // once the POST returns.
    const tempId = `optimistic-${crypto.randomUUID()}`;
    const optimistic: Message = {
      id: tempId,
      role: "agent",
      from: "account_manager",
      content: text,
      attachments: ready.length > 0 ? ready : undefined,
    };
    setOpen((prev) =>
      prev && prev.sessionId === sessionId
        ? { ...prev, messages: [...prev.messages, optimistic] }
        : prev,
    );
    try {
      const res = await fetch(
        `/api/am/sessions/${encodeURIComponent(sessionId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: text,
            ...(ready.length > 0 ? { attachments: ready } : {}),
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const row = data.message as ChatMessagesRow;
      seenIds.current.add(row.id);
      setOpen((prev) =>
        prev && prev.sessionId === sessionId
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === tempId ? rowToMessage(row) : m,
              ),
            }
          : prev,
      );
    } catch (e) {
      console.error("am send failed:", e);
      // Drop the optimistic bubble and restore the composer so the AM can
      // retry without redoing anything (the uploaded files are still valid).
      setOpen((prev) =>
        prev && prev.sessionId === sessionId
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== tempId),
            }
          : prev,
      );
      setComposer(text);
      setPending(snapshotPending);
    } finally {
      setSending(false);
    }
  }

  // Pre-inbox gates: if we got 401/403 from /api/am/inbox, render a
  // sign-in or "needs promotion" prompt instead of the empty inbox.
  if (inboxBlocked === "anonymous") {
    return (
      <>
        <GateScreen
          title="Sign in to the account manager dashboard"
          body="You need to be signed in as an account manager to see incoming sourcing briefs."
          actionLabel="Sign in"
          onAction={() => setAuthPromptOpen(true)}
        />
        <AuthModal
          open={authPromptOpen}
          onClose={() => setAuthPromptOpen(false)}
          redirectTo="/dashboard"
        />
      </>
    );
  }
  if (inboxBlocked === "wrong_role") {
    return (
      <GateScreen
        title="Not an account manager yet"
        body="Your account is signed in but doesn't have the account_manager role. An admin can promote you in the Supabase SQL editor: update public.users set role = 'account_manager' where email = '<your email>';"
      />
    );
  }
  if (inboxBlocked === "unknown") {
    return (
      <GateScreen
        title="Inbox couldn't load"
        body="Refresh the page to try again."
      />
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <DashboardSidebar
        active={open ? "overview" : view}
        onNavigate={navigate}
        inboxCount={briefs.length}
        lessonsCount={lessonsCount}
      />
      <main className="flex h-full min-w-0 flex-1 flex-col">
        {open ? (
          <BriefPane
            brief={open}
            sending={sending}
            composer={composer}
            setComposer={setComposer}
            onComposerChange={notifyTyping}
            otherIsTyping={otherIsTyping}
            onClaim={claim}
            onSend={sendReply}
            onClose={closeBrief}
            endRef={endRef}
            amLanguage={amLanguage}
            onAmLanguageChange={setAmLanguage}
            amTranslating={amTranslating}
            pending={pending}
            onAttach={addFiles}
            onRemoveAttachment={removeAttachment}
            onSaveRating={saveRating}
            onGenerateLessons={generateLessons}
          />
        ) : openLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              Loading brief…
            </span>
          </div>
        ) : view === "lessons" ? (
          <LessonsPane onBack={() => navigate("overview")} />
        ) : view === "models" ? (
          <SettingsPane onBack={() => navigate("overview")} />
        ) : (
          <OverviewPane
            briefs={briefs}
            loading={inboxLoading}
            meId={meId}
            lessonsCount={lessonsCount}
            onSelectBrief={openBrief}
            onOpenLessons={() => navigate("lessons")}
          />
        )}
      </main>
    </div>
  );
}
