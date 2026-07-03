"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  MapPin,
  Loader2,
  ArrowLeft,
  Languages,
  ChevronDown,
  GraduationCap,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { AuthModal } from "@/components/auth/AuthModal";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { TypingIndicator } from "@/components/chat/MessageBubble";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { useRealtimeChat } from "@/lib/useRealtimeChat";
import type {
  AgentLessonsRow,
  ChatMessagesRow,
  ChatSenderType,
  LeadQuality,
  RfqsRow,
  RfqStatus,
} from "@/lib/supabase/types";
import type {
  Message,
  MessageFrom,
  ChatRole,
  PurchaseTimeline,
  NewOrUsedPreference,
} from "@/types/chat";
import {
  attachmentsFromMetadata,
  isAllowedAttachment,
  humanFileSize,
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/attachments";
import {
  uploadAttachment,
  type PendingAttachment,
} from "@/lib/storage/attachments";
import { cn } from "@/lib/utils";
import { cardStrings } from "@/lib/cardStrings";
import { amBriefStrings, type AmBriefStrings } from "@/lib/amBriefStrings";

interface InboxBrief {
  id: string;
  status: "in_handoff";
  handoff_requested_at: string | null;
  assigned_am_user_id: string | null;
  title: string | null;
  updated_at: string;
  // Embedded rfq via PostgREST nested select — comes back as an array
  // even though chat_session→rfqs is 1:1.
  rfqs: Pick<
    RfqsRow,
    | "full_name"
    | "company_name"
    | "business_email"
    | "machine_type"
    | "intended_application"
    | "delivery_country"
    | "purchase_timeline"
    | "hubspot_deal_id"
  >[];
}

interface OpenBrief {
  sessionId: string;
  assignedToMe: boolean;
  rfq: RfqsRow;
  messages: Message[];
}

function rowToMessage(row: ChatMessagesRow): Message {
  const senderRoleMap: Record<ChatSenderType, ChatRole> = {
    user: "user",
    ai: "agent",
    account_manager: "agent",
    system: "divider",
  };
  const from: MessageFrom | undefined =
    row.sender_type === "account_manager" ? "account_manager" : undefined;
  // AM-dashboard translations cached on the row (metadata.translations),
  // keyed by ISO 639-1 code. Hydrated so an already-translated thread
  // renders in the AM's language with no extra backend calls on reload.
  const cached = (
    row.metadata as { translations?: Record<string, string> } | null
  )?.translations;
  return {
    id: row.id,
    role: senderRoleMap[row.sender_type],
    content: row.content,
    from,
    readAt: row.read_at,
    translations:
      cached && typeof cached === "object" ? { ...cached } : undefined,
    attachments: attachmentsFromMetadata(row.metadata),
  };
}

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
  // Lessons review queue view — mutually exclusive with an open brief.
  const [lessonsView, setLessonsView] = useState(false);
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
  // AM's chosen working language for reading the thread. "" = original
  // only. Read straight from localStorage so it persists across briefs.
  // Lazy init (not an effect) is safe from hydration mismatch because the
  // selector only renders once a brief is open — never in the first paint.
  const [amLanguage, setAmLanguageState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const saved = window.localStorage.getItem("nexcierge.am.displayLanguage");
      return saved === "zh" || saved === "hi" ? saved : "";
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
  // outgoing AM bubbles correctly.
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

  const openBrief = useCallback(
    async (sessionId: string) => {
      setOpenLoading(true);
      setLessonsView(false);
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
    if (amLanguage !== "zh" && amLanguage !== "hi") return;
    if (translatingRef.current) return;
    const lang = amLanguage;
    const sessionId = open.sessionId;
    const pending = open.messages.some(
      (m) =>
        m.role !== "divider" &&
        m.content &&
        m.translations?.[lang] === undefined,
    );
    if (!pending) return;
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
      return data.lessons.length;
    } catch (e) {
      console.error("lesson generation failed:", e);
      return null;
    }
  }, [open]);

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
      <InboxPane
        briefs={briefs}
        loading={inboxLoading}
        activeId={open?.sessionId}
        meId={meId}
        onSelect={openBrief}
        lessonsActive={lessonsView}
        onOpenLessons={() => {
          setLessonsView(true);
          setOpen(null);
          setPending([]);
          setComposer("");
        }}
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
            onClose={() => {
              setOpen(null);
              setPending([]);
              setComposer("");
            }}
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
        ) : lessonsView ? (
          <LessonsPane onBack={() => setLessonsView(false)} />
        ) : (
          <EmptyState loading={openLoading} />
        )}
      </main>
    </div>
  );
}


function GateScreen({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-white px-6">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white px-7 py-7 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Nexcierge · Account manager
        </div>
        <h1 className="mt-2 text-lg font-semibold tracking-[-0.01em] text-gray-900">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
        {actionLabel && onAction && (
          <Button
            type="button"
            variant="primary"
            className="mt-5"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}


// ──────────────────────────────────────────────────────────────
// Inbox list (left pane)
// ──────────────────────────────────────────────────────────────

function InboxPane({
  briefs,
  loading,
  activeId,
  meId,
  onSelect,
  lessonsActive,
  onOpenLessons,
}: {
  briefs: InboxBrief[];
  loading: boolean;
  activeId: string | undefined;
  meId: string | null;
  onSelect: (id: string) => void;
  lessonsActive: boolean;
  onOpenLessons: () => void;
}) {
  return (
    <aside className="hidden h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-[#F7F8FA] md:flex">
      <div className="border-b border-gray-200 px-5 py-4">
        <Link
          href="/"
          className="font-semibold tracking-[0.16em] text-[14px] text-gray-900"
        >
          NEXCIERGE
        </Link>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-400">
          Account manager
        </p>
      </div>

      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5" strokeWidth={1.75} />
          Inbox · {briefs.length}
        </span>
        <button
          onClick={onOpenLessons}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors",
            lessonsActive
              ? "bg-[#0F2747] text-white"
              : "text-gray-500 hover:bg-white hover:text-gray-900",
          )}
        >
          <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.75} />
          Lessons
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="px-3 py-6 text-xs text-gray-400">Loading inbox…</div>
        ) : briefs.length === 0 ? (
          <div className="px-3 py-6 text-xs text-gray-400">
            No new briefs. Incoming requests will appear here.
          </div>
        ) : (
          <ul className="space-y-1">
            {briefs.map((b) => {
              const r = b.rfqs?.[0];
              const mine = b.assigned_am_user_id === meId;
              const unclaimed = !b.assigned_am_user_id;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => onSelect(b.id)}
                    className={cn(
                      "block w-full rounded-lg px-3 py-3 text-left transition-colors",
                      b.id === activeId
                        ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        : "hover:bg-white/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {r?.machine_type || b.title || "New brief"}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-gray-500">
                          {r?.company_name || r?.full_name || r?.business_email}
                        </div>
                        {r?.delivery_country && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400">
                            <MapPin
                              className="h-3 w-3"
                              strokeWidth={1.5}
                            />
                            {r.delivery_country}
                          </div>
                        )}
                      </div>
                      {unclaimed ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          Unclaimed
                        </span>
                      ) : mine ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                          Mine
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                          Other AM
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-200 px-5 py-4">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">
          Account manager
        </div>
        <AccountMenu variant="compact" redirectTo="/dashboard" />
      </div>
    </aside>
  );
}


// ──────────────────────────────────────────────────────────────
// Brief detail + chat (right pane)
// ──────────────────────────────────────────────────────────────

function BriefPane({
  brief,
  sending,
  composer,
  setComposer,
  onComposerChange,
  otherIsTyping,
  onClaim,
  onSend,
  onClose,
  endRef,
  amLanguage,
  onAmLanguageChange,
  amTranslating,
  pending,
  onAttach,
  onRemoveAttachment,
  onSaveRating,
  onGenerateLessons,
}: {
  brief: OpenBrief;
  sending: boolean;
  composer: string;
  setComposer: (v: string) => void;
  onComposerChange: () => void;
  otherIsTyping: boolean;
  onClaim: () => void;
  onSend: () => void;
  onClose: () => void;
  endRef: React.RefObject<HTMLDivElement | null>;
  amLanguage: string;
  onAmLanguageChange: (lang: string) => void;
  amTranslating: boolean;
  pending: PendingAttachment[];
  onAttach: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onSaveRating: (input: {
    quality: LeadQuality;
    issues: string[];
    notes: string;
  }) => Promise<boolean>;
  onGenerateLessons: () => Promise<number | null>;
}) {
  const chrome = amBriefStrings(amLanguage);
  const { rfq, messages, assignedToMe } = brief;
  const uploading = pending.some((p) => p.uploading);
  const hasReadyAttachment = pending.some((p) => p.uploaded);
  const atAttachmentCap = pending.length >= MAX_ATTACHMENTS_PER_MESSAGE;

  return (
    <>
      <header className="flex items-center justify-between border-b border-gray-200 bg-white/85 px-6 py-4 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onClose}
            aria-label="Back to inbox"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 md:hidden"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-gray-900">
              {rfq.machine_type || "Sourcing brief"} ·{" "}
              <span className="font-normal text-gray-600">
                {rfq.company_name || rfq.full_name || rfq.business_email}
              </span>
            </h1>
            <p className="truncate text-xs text-gray-500">
              {rfq.intended_application} · {rfq.delivery_city_or_port},{" "}
              {rfq.delivery_country}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSelector
            value={amLanguage}
            onChange={onAmLanguageChange}
            translating={amTranslating}
          />
          {!assignedToMe && (
            <Button size="sm" variant="primary" onClick={onClaim}>
              {chrome.claimBrief}
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  viewerRole="account_manager"
                  amDisplayLanguage={amLanguage}
                />
              ))}
              {otherIsTyping && <TypingIndicator />}
              <div ref={endRef} />
            </div>
          </div>

          {assignedToMe ? (
            <div className="border-t border-gray-200 bg-white px-6 py-4">
              <div className="mx-auto max-w-3xl">
                <ChatComposer
                  value={composer}
                  onChange={(v) => {
                    setComposer(v);
                    if (v) onComposerChange();
                  }}
                  onSubmit={onSend}
                  disabled={sending}
                  placeholder={
                    sending ? "Sending…" : "Message the buyer…"
                  }
                  onAttach={onAttach}
                  attachAccept={ATTACHMENT_ACCEPT}
                  pendingAttachments={pending}
                  onRemoveAttachment={onRemoveAttachment}
                  attachDisabled={atAttachmentCap}
                  allowEmptySubmit={hasReadyAttachment}
                  submitDisabled={uploading}
                />
                <div className="mt-2 text-center text-[11px] text-gray-400">
                  Press Enter to send · Attach documents or media · Buyer sees
                  your reply in realtime
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-200 bg-amber-50 px-6 py-3 text-center text-xs text-amber-800">
              Claim this brief to reply.
            </div>
          )}
        </div>

        <BriefSummary
          rfq={rfq}
          language={amLanguage}
          canRate={assignedToMe}
          onSaveRating={onSaveRating}
          onGenerateLessons={onGenerateLessons}
        />
      </div>
    </>
  );
}


// Header control letting the AM read the whole thread in their working
// language. "" = original only; "zh"/"hi" translate every message and
// show the translation under each original. The choice is global (lifted
// to DashboardPage + persisted), so it sticks across briefs.
function LanguageSelector({
  value,
  onChange,
  translating,
}: {
  value: string;
  onChange: (lang: string) => void;
  translating: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {translating && (
        <Loader2
          className="h-3.5 w-3.5 animate-spin text-gray-400"
          strokeWidth={1.75}
          aria-label="Translating…"
        />
      )}
      <label className="relative inline-flex items-center">
        <Languages
          className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400"
          strokeWidth={1.75}
        />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Read this thread in"
          className="appearance-none rounded-full border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F2747]/15"
        >
          <option value="">Original only</option>
          <option value="zh">中文 (Chinese)</option>
          <option value="hi">हिन्दी (Hindi)</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-gray-400"
          strokeWidth={1.75}
        />
      </label>
    </div>
  );
}


function BriefSummary({
  rfq,
  language,
  canRate,
  onSaveRating,
  onGenerateLessons,
}: {
  rfq: RfqsRow;
  language: string;
  canRate: boolean;
  onSaveRating: (input: {
    quality: LeadQuality;
    issues: string[];
    notes: string;
  }) => Promise<boolean>;
  onGenerateLessons: () => Promise<number | null>;
}) {
  // Section titles + field labels + the timeline/condition enum tables are
  // shared with the buyer-facing ProfileSummaryCard (lib/cardStrings.ts).
  // The brief itself is ALWAYS rendered in English — titles, labels, and
  // enum values stay canonical regardless of the AM's display language, so
  // the brief matches HubSpot/CRM records and the buyer's submitted data.
  // Only AM-only chrome (CRM section, status pill, rating card) from
  // lib/amBriefStrings.ts localizes to the AM's chosen `language`. The
  // brief's free-text values are shown exactly as the buyer submitted them
  // — we no longer translate the brief itself (a future "download in
  // language X" export can translate on demand).
  const t = cardStrings("en");
  const chrome = amBriefStrings(language);
  // English chrome for strings that live inside the brief reading surface
  // (panel header, empty-specs placeholder) — they follow the brief, not
  // the AM language.
  const chromeEn = amBriefStrings("");
  const machineType = rfq.machine_type;
  const application = rfq.intended_application;
  const notes = rfq.additional_notes;
  const specs = Object.entries(rfq.technical_specifications ?? {});

  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-gray-200 bg-[#F7F8FA] px-5 py-6 lg:block">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {chromeEn.briefDetailsTitle}
      </div>

      <Section title={t.sectionBuyer}>
        <Field label={t.labelName} value={rfq.full_name} />
        <Field label={t.labelCompany} value={rfq.company_name} />
        <Field label={t.labelEmail} value={rfq.business_email} />
        <Field label={t.labelPhone} value={rfq.phone_number} />
        <Field label={t.labelRole} value={rfq.job_role} />
      </Section>

      <Section title={t.sectionMachine}>
        <Field label={t.labelType} value={machineType} />
        <Field label={t.labelApplication} value={application} />
        <Field label={t.labelQuantity} value={rfq.quantity} />
        <Field
          label={t.labelNewUsed}
          value={
            isNewOrUsedPreference(rfq.new_or_used_preference)
              ? t.condition[rfq.new_or_used_preference]
              : rfq.new_or_used_preference
          }
        />
      </Section>

      <Section title={t.sectionDelivery}>
        <Field label={t.labelCountry} value={rfq.delivery_country} />
        <Field label={t.labelCityPort} value={rfq.delivery_city_or_port} />
        <Field
          label={t.labelTimeline}
          value={
            isPurchaseTimeline(rfq.purchase_timeline)
              ? t.timeline[rfq.purchase_timeline]
              : rfq.purchase_timeline
          }
        />
        <Field label={t.labelBudget} value={rfq.budget_range} />
      </Section>

      <Section title={t.sectionSpecs}>
        {specs.length === 0 ? (
          <p className="text-[11px] italic text-gray-400">
            {chromeEn.noSpecsCaptured}
          </p>
        ) : (
          specs.map(([k, v]) => (
            <Field
              key={k}
              label={humanizeKey(k)}
              value={String(v)}
            />
          ))
        )}
        {rfq.compliance_requirements.length > 0 && (
          <Field
            label={t.labelCompliance}
            value={rfq.compliance_requirements.join(", ")}
          />
        )}
      </Section>

      {notes && (
        <Section title={t.sectionNotes}>
          <p className="text-xs leading-relaxed text-gray-700">{notes}</p>
        </Section>
      )}

      <Section title={chrome.sectionCrm}>
        <StatusPill status={rfq.status} chrome={chrome} />
        {rfq.hubspot_deal_id ? (
          <p className="mt-2 text-[11px] text-gray-500">
            {chrome.hubspotDealPrefix} {rfq.hubspot_deal_id}
          </p>
        ) : (
          <p className="mt-2 text-[11px] italic text-gray-400">
            {chrome.notPushedToHubspot}
          </p>
        )}
      </Section>

      <Section title={chrome.sectionRating}>
        {canRate ? (
          <RatingSection
            key={rfq.id}
            rfq={rfq}
            chrome={chrome}
            onSave={onSaveRating}
            onGenerate={onGenerateLessons}
          />
        ) : (
          <p className="text-[11px] italic text-gray-400">
            {chrome.claimToRate}
          </p>
        )}
      </Section>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────
// Lead rating + lesson generation (sidebar card)
// ──────────────────────────────────────────────────────────────

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

const QUALITY_CHIP: Record<LeadQuality, string> = {
  qualified: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-800",
  junk: "bg-red-100 text-red-800",
};

// Keyed by rfq.id in the parent so all state resets when the AM switches
// briefs. Two modes: editing (fresh or via Edit) shows the full form;
// rated shows the verdict chip + the Generate-lessons button.
function RatingSection({
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

  if (!editing && rfq.lead_quality) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
              QUALITY_CHIP[rfq.lead_quality],
            )}
          >
            {qualityLabel[rfq.lead_quality]}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.75} />
            {chrome.editRating}
          </button>
        </div>
        {rfq.lead_quality_field_issues.length > 0 && (
          <p className="text-[11px] text-gray-500">
            {issueOptions(chrome)
              .filter((o) => rfq.lead_quality_field_issues.includes(o.slug))
              .map((o) => o.label)
              .join(", ")}
          </p>
        )}
        {rfq.lead_quality_notes && (
          <p className="text-[11px] italic text-gray-500">
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
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500">{chrome.ratingQuestion}</p>
      <div className="flex gap-1.5">
        {(["qualified", "partial", "junk"] as LeadQuality[]).map((q) => (
          <button
            key={q}
            onClick={() => setQuality(q)}
            className={cn(
              "flex-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
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
        <p className="mb-1.5 text-[11px] text-gray-500">
          {chrome.issuesQuestion}
        </p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {issueOptions(chrome).map((o) => (
            <label
              key={o.slug}
              className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-700"
            >
              <input
                type="checkbox"
                checked={issues.has(o.slug)}
                onChange={() => toggleIssue(o.slug)}
                className="h-3 w-3 rounded border-gray-300 accent-[#0F2747]"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] text-gray-500">{chrome.noteLabel}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={chrome.notePlaceholder}
          rows={2}
          maxLength={2000}
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F2747]/15"
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


function isPurchaseTimeline(v: string): v is PurchaseTimeline {
  return v === "urgent_less_than_30_days" || v === "1_to_3_months" || v === "3_to_6_months" || v === "just_researching";
}


function isNewOrUsedPreference(v: string): v is NewOrUsedPreference {
  return v === "new" || v === "used" || v === "refurbished" || v === "no_preference";
}


function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}


// The label floats left so the value starts on the SAME line as it and wraps to
// the full width BELOW the label when long (rather than being clipped by
// `truncate` in this narrow w-80 sidebar). `overflow-hidden` on the row contains
// the float so it can't bleed into the next row. Used for every field in the
// brief — short labels keep the value on one line; long ones wrap underneath.
function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="overflow-hidden text-xs">
      <span className="float-left mr-2 text-gray-400">{label}</span>
      <span className="break-words font-medium text-gray-800">{value}</span>
    </div>
  );
}


// Technical-spec keys come from two sources: curated CSV data points (already
// nicely phrased, e.g. "Film Width & Layer Configuration") and the agent's own
// snake_case keys (e.g. "target_output"). Normalise the latter to Title Case
// for display; leave already-spaced labels untouched.
function humanizeKey(key: string): string {
  if (/[_-]/.test(key)) {
    return key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }
  return key;
}


function StatusPill({
  status,
  chrome,
}: {
  status: RfqStatus;
  chrome: AmBriefStrings;
}) {
  const map: Record<RfqStatus, { label: string; className: string }> = {
    in_progress: {
      label: chrome.statusInProgress,
      className: "bg-blue-100 text-blue-800",
    },
    submitted: {
      label: chrome.statusSubmitted,
      className: "bg-emerald-100 text-emerald-800",
    },
    won: { label: chrome.statusWon, className: "bg-emerald-100 text-emerald-800" },
    lost: { label: chrome.statusLost, className: "bg-gray-200 text-gray-700" },
  };
  const v = map[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        v.className,
      )}
    >
      {v.label}
    </span>
  );
}


// ──────────────────────────────────────────────────────────────
// Lessons review queue (main pane)
// ──────────────────────────────────────────────────────────────

// Machine-drafted improvement lessons awaiting human review. Approve
// (optionally after editing), or reject. English-only chrome, same as
// the inbox — the AM language selector only localizes brief details.
function LessonsPane({ onBack }: { onBack: () => void }) {
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
          aria-label="Back to inbox"
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


function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          Loading brief…
        </span>
      ) : (
        <span>Pick a brief from the inbox to start replying.</span>
      )}
    </div>
  );
}
