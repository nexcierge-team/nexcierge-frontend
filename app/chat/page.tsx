"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Menu, PanelRight } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatComposer } from "@/components/chat/ChatComposer";
import {
  MessageBubble,
  TypingIndicator,
} from "@/components/chat/MessageBubble";
import {
  SourcingProgressRail,
  requestStatusPill,
} from "@/components/chat/SourcingProgressRail";
import {
  DocumentsPanel,
  documentsFromMessages,
} from "@/components/chat/DocumentsPanel";
import { PaymentsPanel } from "@/components/chat/PaymentsPanel";
import { useSessionPayments } from "@/lib/useSessionPayments";
import { cn } from "@/lib/utils";
import { AuthModal } from "@/components/auth/AuthModal";
import { LANDING_SEED_KEY, SUGGESTED_PROMPTS } from "@/lib/constants";
import { useChat } from "@/lib/useChat";
import { useSessionsList } from "@/lib/useSessionsList";
import { useStableCallback } from "@/lib/useStableCallback";
import { ChatShellSkeleton } from "@/components/chat/ChatShellSkeleton";
import type { Message } from "@/types/chat";
import { chatStrings } from "@/lib/chatStrings";
import { PROGRESS_EN, type WorkspaceTab } from "@/lib/progressStrings";
import type { ChatSessionsRow } from "@/lib/supabase/types";

// Cycled by the empty-state composer as an animated placeholder — one phrase
// per target buyer language (en, de, zh, hi, es) to signal "type in your own
// language" before the per-session language detection kicks in.
const HERO_PLACEHOLDERS = [
  "Tell us what machinery you're looking for…",
  "Sagen Sie uns, welche Maschinen Sie suchen…",
  "告诉我们您在寻找什么机械设备…",
  "हमें बताएं कि आपको कौन-सी मशीनरी चाहिए…",
  "Cuéntanos qué maquinaria estás buscando…",
];

const SIDEBAR_COLLAPSED_KEY = "nx_sidebar_collapsed";
const WORKSPACE_TABS: WorkspaceTab[] = ["chat", "documents", "payments"];

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

// Reads and clears a message typed into the landing page's agent console
// (see components/landing/AgentConsole.tsx). Storage can throw in locked-
// down browsers; treat that as "no seed".
function takeLandingSeed(): string | null {
  try {
    const value = window.sessionStorage.getItem(LANDING_SEED_KEY);
    if (value != null) window.sessionStorage.removeItem(LANDING_SEED_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export default function ChatPage() {
  // useSearchParams forces client-side rendering for this route, so we
  // wrap the inner component in Suspense to satisfy Next's CSR-bailout
  // requirement during static prerendering. The fallback is the chat
  // shell skeleton, so the prerendered HTML paints a recognizable layout
  // immediately instead of a blank page while JS loads.
  return (
    <Suspense fallback={<ChatShellSkeleton />}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  // Category cards on the homepage send users here with
  // `?seed=<prompt>&new=1` to start a fresh chat pre-filled with the
  // category they picked. We use next/navigation's useSearchParams so
  // the values are correct on both SSR and client (window.location is
  // only available on the client, and a useMemo guarded with
  // `typeof window` returns stale nulls after hydration).
  const searchParams = useSearchParams();
  // Freeze entry on the first render so stripping the params later
  // doesn't flip forceNew back to false and re-trigger bootstrap.
  const [entry] = useState(() => ({
    seed: searchParams.get("seed"),
    forceNew: searchParams.get("new") === "1",
  }));

  const {
    sessionId,
    messages,
    loading,
    awaitingReply,
    bootstrapping,
    reviewRequested,
    reviewSubmitting,
    bootstrapError,
    authPromptOpen,
    dismissAuthPrompt,
    signupRequired,
    signupGateOpen,
    openSignupGate,
    dismissSignupGate,
    otherIsTyping,
    notifyTyping,
    sendMessage,
    retry,
    requestReview,
    switchSession,
    sessionsSeed,
    language,
    sessionStatus,
    sessionTitle,
    handoffRequestedAt,
    sourcingStage,
    sourcingStageHistory,
  } = useChat({ forceNew: entry.forceNew });
  // Localized chat chrome, keyed off the buyer's display language (learned
  // per-turn from the backend's reply_language). Applies to the chat
  // surface only — sidebar/rail chrome is English-pinned (PROGRESS_EN).
  const cs = chatStrings(language);
  // Mobile drawer state for ChatSidebar. Desktop ignores it (sidebar is
  // always inline at md+). Reset to closed on session switch so the
  // newly-loaded chat is the foreground after the drawer dismissal.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Below-xl drawer state for the sourcing-progress rail (inline at xl+).
  const [railOpen, setRailOpen] = useState(false);
  // Desktop collapsed sidebar (icon rail), remembered per browser. The
  // page is client-rendered (useSearchParams bailout), so reading storage
  // in the initializer can't mismatch server HTML.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window === "undefined" ? false : readCollapsed(),
  );
  function toggleSidebarCollapsed() {
    setSidebarCollapsed((v) => {
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, v ? "0" : "1");
      } catch {
        // Storage blocked: the toggle still works for this page view.
      }
      return !v;
    });
  }
  // Request workspace tab (Chat / Documents / Payments). Stored with the
  // session it was picked for and read through a guard, so switching
  // requests always lands on Chat without an effect-based reset.
  const [tabState, setTabState] = useState<{
    sessionId: string | null;
    tab: WorkspaceTab;
  }>({ sessionId: null, tab: "chat" });
  // Message to scroll to when "Show in chat" switches back to the Chat tab.
  const scrollTargetRef = useRef<string | null>(null);
  // Latest realtime chat_sessions row for the ACTIVE session — overrides
  // the useChat bootstrap baseline so the rail reflects AM claims and
  // stage advances live. Cleared on session switch.
  const [activeRow, setActiveRow] = useState<ChatSessionsRow | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const seedSentRef = useRef(false);

  // One sessions list + realtime subscription for the whole page — feeds
  // both the sidebar and (via onActiveSessionUpdate) the progress rail.
  const {
    sessions,
    loading: sessionsLoading,
    creating,
    deletingId,
    createSession,
    deleteSession,
  } = useSessionsList({
    seed: sessionsSeed,
    activeId: sessionId,
    onDeleteActive: () => switchSession(null),
    onActiveSessionUpdate: setActiveRow,
  });

  async function handleNewRequest() {
    if (creating) return;
    const id = await createSession();
    if (id) switchSession(id);
  }

  // Rail data: realtime row wins over the bootstrap baseline. A stored
  // row is only honored while it matches the loaded session — read-time
  // guard instead of an effect-based reset on switch, so a row from a
  // previously-open session can never bleed into the new one.
  const liveRow = activeRow && activeRow.id === sessionId ? activeRow : null;
  const railStatus = liveRow?.status ?? sessionStatus;
  const railTitle = liveRow?.title ?? sessionTitle;
  const railStage = liveRow?.sourcing_stage ?? sourcingStage;
  const railHistory = liveRow?.sourcing_stage_history ?? sourcingStageHistory;
  const railHandoffAt = liveRow?.handoff_requested_at ?? handoffRequestedAt;
  const isDraft = railStatus === "ai";

  const tab: WorkspaceTab =
    tabState.sessionId === sessionId ? tabState.tab : "chat";
  function openTab(next: WorkspaceTab) {
    setTabState({ sessionId, tab: next });
    setRailOpen(false);
  }

  // Per-request order file: documents come from the loaded thread's
  // attachments; payment links from payment_requests (skipped for drafts,
  // which can't have any until an AM claims the brief).
  const documents = useMemo(() => documentsFromMessages(messages), [messages]);
  const { payments, loading: paymentsLoading } = useSessionPayments(
    sessionId,
    !isDraft,
  );
  const paymentsPending = payments.filter((p) => p.status === "pending").length;

  // Coming back to the Chat tab: jump to the message "Show in chat"
  // pointed at, otherwise to the latest message.
  useEffect(() => {
    if (tab !== "chat") return;
    const target = scrollTargetRef.current;
    scrollTargetRef.current = null;
    const el = target ? document.getElementById(`msg-${target}`) : null;
    if (el) el.scrollIntoView({ block: "center" });
    else endRef.current?.scrollIntoView({ block: "end" });
  }, [tab]);

  // Smooth-scroll when a message is added or the typing dots appear; while
  // a reply streams, keep the growing bubble pinned to the bottom without
  // queuing a smooth animation per frame.
  const lastMessage = messages[messages.length - 1];
  const streamingLength = lastMessage?.streaming ? lastMessage.content.length : 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, awaitingReply]);
  useEffect(() => {
    if (streamingLength > 0) endRef.current?.scrollIntoView({ block: "end" });
  }, [streamingLength]);

  // Auto-send the seed once the session is bootstrapped and still empty.
  // Two sources: `?seed=` (the landing page's canned starter chips) and
  // sessionStorage (text the visitor typed into the landing console, kept
  // out of the URL because it is their own words). We strip the query
  // params after sending so a refresh doesn't replay the seed into a new
  // session; the storage entry is removed as it is read.
  useEffect(() => {
    if (seedSentRef.current) return;
    if (!entry.seed && !entry.forceNew) return;
    // Wait for bootstrap to fully resolve — sessionId becomes truthy
    // partway through, but bootstrapping=false is the all-clear that
    // sendMessage's internal `!sessionId` guard will pass.
    if (bootstrapping || !sessionId) return;
    if (messages.length > 0) return;
    seedSentRef.current = true;
    const seed = entry.seed ?? takeLandingSeed();
    if (!seed) return;
    void sendMessage(seed);
    const url = new URL(window.location.href);
    url.searchParams.delete("seed");
    url.searchParams.delete("new");
    const q = url.searchParams.toString();
    window.history.replaceState(
      {},
      "",
      url.pathname + (q ? `?${q}` : ""),
    );
  }, [
    entry.seed,
    entry.forceNew,
    bootstrapping,
    sessionId,
    messages.length,
    sendMessage,
  ]);

  // Stable so memoized bubbles (quick-reply pills) and the composer don't
  // re-render on every page render. Returns false when nothing was sent,
  // so the composer keeps the typed text.
  const send = useStableCallback(async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed || loading) return false;
    // Guest out of free messages — open the signup gate instead of sending
    // (keeps the typed text; the composer is locked anyway).
    if (signupRequired) {
      openSignupGate();
      return false;
    }
    return sendMessage(trimmed);
  });

  // Sidebar swaps conversations in-place via useChat.switchSession —
  // it updates the URL with history.pushState (so refresh + back-button
  // still work) and re-runs the bootstrap effect against the new
  // session_id. No full page reload, no welcome-state flash.
  // Hide the welcome screen while bootstrapping so the initial load
  // (and every subsequent switch) doesn't flash the empty-state UI
  // before the real messages arrive.
  const isEmpty = !bootstrapping && messages.length === 0 && !bootstrapError;
  const showTabs = !isEmpty && !bootstrapError && !!sessionId;
  const headerPill = requestStatusPill(railStatus, railStage);
  const headerTitle =
    railTitle ||
    (isEmpty ? PROGRESS_EN.newRequest : bootstrapping ? "" : PROGRESS_EN.untitledRequest);

  return (
    // h-[100dvh] tracks the iOS Safari dynamic viewport (collapsing URL
    // bar) where h-screen / 100vh would over-extend behind the bottom
    // chrome and push the composer behind the home indicator.
    <div className="flex h-[100dvh] overflow-hidden bg-paper">
      <ChatSidebar
        sessions={sessions}
        loading={sessionsLoading}
        creating={creating}
        deletingId={deletingId}
        activeId={sessionId ?? undefined}
        onNew={() => void handleNewRequest()}
        onSelect={(id) => switchSession(id)}
        onDelete={deleteSession}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col bg-sheet">
        <header className="border-b border-rule-strong bg-sheet pt-safe">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 py-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label={cs.historyAria}
                className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint md:hidden"
              >
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              </button>
              {/* ph-no-capture: the title derives from the buyer's first
                  message. */}
              <h1 className="ph-no-capture type-title min-w-0 truncate text-sm font-bold text-ink sm:text-[15px]">
                {headerTitle}
              </h1>
              {!isEmpty && !bootstrapping && (
                <span
                  className={cn(
                    "type-data inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold xl:hidden",
                    headerPill.className,
                  )}
                >
                  {headerPill.label}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => setRailOpen(true)}
                aria-label={PROGRESS_EN.progressAria}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint xl:hidden"
              >
                <PanelRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <Link
                href="/"
                className="text-sm font-semibold text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Exit
              </Link>
            </div>
          </div>

          {showTabs && (
            <div
              role="tablist"
              aria-label={PROGRESS_EN.tabsAria}
              className="-mb-px flex gap-1 overflow-x-auto px-3 sm:px-5"
            >
              {WORKSPACE_TABS.map((t) => {
                const selected = tab === t;
                const badge =
                  t === "documents"
                    ? documents.length
                    : t === "payments"
                      ? paymentsPending || payments.length
                      : 0;
                const attention = t === "payments" && paymentsPending > 0;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    id={`tab-${t}`}
                    aria-selected={selected}
                    aria-controls="workspace-panel"
                    onClick={() => openTab(t)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blueprint",
                      selected
                        ? "border-ink text-ink"
                        : "border-transparent text-ink-soft hover:border-rule-strong hover:text-ink",
                    )}
                  >
                    {PROGRESS_EN.tabLabel[t]}
                    {badge > 0 && (
                      <span
                        className={cn(
                          "type-data min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-semibold",
                          attention
                            ? "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-700/30"
                            : "bg-ink/10 text-ink",
                        )}
                        aria-label={
                          attention
                            ? `${badge} ${PROGRESS_EN.paymentStatus.pending.toLowerCase()}`
                            : undefined
                        }
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <div
          id="workspace-panel"
          role={showTabs ? "tabpanel" : undefined}
          aria-labelledby={showTabs ? `tab-${tab}` : undefined}
          className={cn(
            "flex-1 overflow-y-auto",
            showTabs && tab !== "chat" ? "bg-paper" : "bg-ruled",
          )}
        >
          {bootstrapError ? (
            <div className="mx-auto flex h-full max-w-2xl items-center justify-center px-6">
              <div className="rounded-none border-[1.5px] border-redline bg-white px-6 py-5 text-sm text-red-900">
                {bootstrapError}
              </div>
            </div>
          ) : showTabs && tab === "documents" ? (
            <DocumentsPanel
              documents={documents}
              isDraft={isDraft}
              onShowInChat={(messageId) => {
                scrollTargetRef.current = messageId;
                openTab("chat");
              }}
            />
          ) : showTabs && tab === "payments" ? (
            <PaymentsPanel
              sessionId={sessionId}
              payments={payments}
              loading={paymentsLoading}
              isDraft={isDraft}
            />
          ) : (
            <AnimatePresence mode="wait">
              {isEmpty ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 sm:px-6"
                >
                  <div className="w-full">
                    <h1 className="type-display text-center text-3xl font-extrabold text-ink sm:text-4xl">
                      What machinery are you sourcing?
                    </h1>
                    <p className="mt-3 text-center text-base text-ink-soft">
                      Describe what you need in your own words. The agent will
                      qualify the requirements.
                    </p>

                    <div className="mt-10">
                      <ChatComposer
                        onChange={(v) => {
                          if (v) notifyTyping();
                        }}
                        onSubmit={send}
                        placeholder="Tell us what machinery you're looking for…"
                        rotatingPlaceholders={HERO_PLACEHOLDERS}
                        disabled={loading}
                        autoFocus
                        rows={2}
                        language={language}
                      />
                    </div>

                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {SUGGESTED_PROMPTS.map((p) => (
                        <button
                          key={p}
                          onClick={() => send(p)}
                          disabled={loading}
                          className="rounded-full border-[1.5px] border-ink bg-white px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint disabled:opacity-50"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10"
                >
                  <div className="space-y-5">
                    {messages.map((m, i) => (
                      // Anchor for the Documents tab's "Show in chat".
                      <div
                        key={messageKey(m)}
                        id={`msg-${m.id}`}
                        className="scroll-mt-6"
                      >
                        <MessageBubble
                          message={m}
                          reviewRequested={reviewRequested}
                          reviewSubmitting={reviewSubmitting}
                          onRequestReview={requestReview}
                          onRetry={retry}
                          // Only error bubbles show Retry; passing `loading` to
                          // every bubble would re-render all of them per turn.
                          retryDisabled={m.error ? loading : false}
                          sessionLanguage={language}
                          onSuggestion={
                            i === messages.length - 1 && !loading && !signupRequired
                              ? send
                              : undefined
                          }
                        />
                      </div>
                    ))}
                    {(awaitingReply || otherIsTyping) && <TypingIndicator />}
                    <div ref={endRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {!isEmpty && !bootstrapError && tab === "chat" && (
          // pb-safe on the outer carves the home-indicator gap below the
          // composer's normal py-* rhythm — without the wrapper the inset
          // would override py-3 instead of adding to it.
          <div className="border-t border-rule-strong bg-sheet pb-safe">
            <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6 sm:py-4">
              {signupRequired ? (
                // Guest signup wall: the composer is replaced by a locked
                // "sign in to continue" bar so no further messages can be sent
                // without an account. Clicking it re-opens the AuthModal (which
                // also auto-opens once, on hitting the limit).
                <button
                  type="button"
                  onClick={openSignupGate}
                  className="type-title flex w-full items-center justify-center gap-2 rounded-sm border-2 border-ink bg-transparent px-5 py-3.5 text-sm font-bold text-ink btn-wipe hover:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint"
                >
                  <Lock className="h-4 w-4" strokeWidth={1.75} />
                  {cs.gateButton}
                </button>
              ) : (
                <ChatComposer
                  onSubmit={send}
                  disabled={loading}
                  language={language}
                  placeholder={
                    reviewRequested ? cs.composerHandoff : cs.composerReply
                  }
                />
              )}
              <div className="mt-2 text-center text-[11px] text-gray-500">
                {signupRequired ? cs.gateHint : cs.composerHint}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sourcing-progress rail: inline at xl+, off-canvas right drawer
          below (opened from the header's PanelRight button). */}
      <SourcingProgressRail
        title={railTitle}
        status={railStatus}
        sourcingStage={railStage}
        sourcingStageHistory={railHistory}
        handoffRequestedAt={railHandoffAt}
        open={railOpen}
        onClose={() => setRailOpen(false)}
        orderFile={
          showTabs
            ? {
                documents: documents.length,
                payments: payments.length,
                paymentsPending,
                onOpen: openTab,
              }
            : undefined
        }
      />

      {/* Handoff gate (401 on Request human review). Suppressed while the
          signup gate is up so the two can't stack. */}
      <AuthModal
        open={authPromptOpen && !signupGateOpen}
        onClose={dismissAuthPrompt}
      />
      {/* Guest signup gate (free-message limit). Returns the buyer to this
          same session after sign-in — no resume=handoff, they just keep
          chatting once isAnonymous flips false. */}
      <AuthModal
        open={signupGateOpen}
        onClose={dismissSignupGate}
        redirectTo={sessionId ? `/chat?session_id=${sessionId}` : "/chat"}
        title="Create your free account to continue"
        description="You've used your free preview messages. Sign in to keep chatting with your sourcing concierge. Your conversation stays saved."
      />
    </div>
  );
}

// React key for a bubble. An agent reply keeps ONE key from its first
// streamed token to the saved row (whose id only exists at reply_done),
// so the bubble updates in place instead of remounting and replaying its
// entry animation. Everything else keys on its id.
function messageKey(m: Message): string {
  return m.role === "agent" && m.clientId && !m.error ? `agent:${m.clientId}` : m.id;
}
