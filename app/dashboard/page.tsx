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
  ChatMessagesRow,
  ChatSenderType,
  RfqsRow,
  RfqStatus,
} from "@/lib/supabase/types";
import type { Message, MessageFrom, ChatRole } from "@/types/chat";
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
          />
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
}: {
  briefs: InboxBrief[];
  loading: boolean;
  activeId: string | undefined;
  meId: string | null;
  onSelect: (id: string) => void;
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

      <div className="border-b border-gray-200 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5" strokeWidth={1.75} />
          Inbox · {briefs.length}
        </span>
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
}) {
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
              Claim this brief
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

        <BriefSummary rfq={rfq} />
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


function BriefSummary({ rfq }: { rfq: RfqsRow }) {
  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-gray-200 bg-[#F7F8FA] px-5 py-6 lg:block">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Brief details
      </div>

      <Section title="Buyer">
        <Field label="Name" value={rfq.full_name} />
        <Field label="Company" value={rfq.company_name} />
        <Field label="Email" value={rfq.business_email} />
        <Field label="Phone" value={rfq.phone_number} />
        <Field label="Role" value={rfq.job_role} />
      </Section>

      <Section title="Machine">
        <Field label="Type" value={rfq.machine_type} />
        <Field label="Application" value={rfq.intended_application} />
        <Field label="Quantity" value={rfq.quantity} />
        <Field label="New / used" value={rfq.new_or_used_preference} />
      </Section>

      <Section title="Delivery">
        <Field label="Country" value={rfq.delivery_country} />
        <Field label="City / port" value={rfq.delivery_city_or_port} />
        <Field label="Timeline" value={rfq.purchase_timeline} />
        <Field label="Budget" value={rfq.budget_range} />
      </Section>

      <Section title="Specs">
        {Object.entries(rfq.technical_specifications ?? {}).length === 0 ? (
          <p className="text-[11px] italic text-gray-400">
            No technical specs captured.
          </p>
        ) : (
          Object.entries(rfq.technical_specifications).map(([k, v]) => (
            <Field key={k} label={humanizeKey(k)} value={String(v)} />
          ))
        )}
        {rfq.compliance_requirements.length > 0 && (
          <Field
            label="Compliance"
            value={rfq.compliance_requirements.join(", ")}
          />
        )}
      </Section>

      {rfq.additional_notes && (
        <Section title="Additional notes">
          <p className="text-xs leading-relaxed text-gray-700">
            {rfq.additional_notes}
          </p>
        </Section>
      )}

      <Section title="CRM">
        <StatusPill status={rfq.status} />
        {rfq.hubspot_deal_id ? (
          <p className="mt-2 text-[11px] text-gray-500">
            HubSpot deal {rfq.hubspot_deal_id}
          </p>
        ) : (
          <p className="mt-2 text-[11px] italic text-gray-400">
            Not yet pushed to HubSpot.
          </p>
        )}
      </Section>
    </aside>
  );
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


function StatusPill({ status }: { status: RfqStatus }) {
  const map: Record<RfqStatus, { label: string; className: string }> = {
    in_progress: {
      label: "In progress",
      className: "bg-blue-100 text-blue-800",
    },
    submitted: {
      label: "Submitted",
      className: "bg-emerald-100 text-emerald-800",
    },
    won: { label: "Won", className: "bg-emerald-100 text-emerald-800" },
    lost: { label: "Lost", className: "bg-gray-200 text-gray-700" },
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
