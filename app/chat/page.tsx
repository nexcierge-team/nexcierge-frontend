"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Menu, Sparkles } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatComposer } from "@/components/chat/ChatComposer";
import {
  MessageBubble,
  TypingIndicator,
} from "@/components/chat/MessageBubble";
import { AuthModal } from "@/components/auth/AuthModal";
import { SUGGESTED_PROMPTS } from "@/lib/mockData";
import { useChat } from "@/lib/useChat";
import { chatStrings } from "@/lib/chatStrings";

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

export default function ChatPage() {
  // useSearchParams forces client-side rendering for this route, so we
  // wrap the inner component in Suspense to satisfy Next's CSR-bailout
  // requirement during static prerendering. The fallback is intentionally
  // empty — the page renders instantly on the client anyway.
  return (
    <Suspense fallback={null}>
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
    language,
  } = useChat({ forceNew: entry.forceNew });
  // Localized chat chrome, keyed off the buyer's display language (learned
  // per-turn from the backend's reply_language).
  const cs = chatStrings(language);
  const [input, setInput] = useState("");
  // Mobile drawer state for ChatSidebar. Desktop ignores it (sidebar is
  // always inline at md+). Reset to closed on session switch so the
  // newly-loaded chat is the foreground after the drawer dismissal.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const seedSentRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-send the seed once the session is bootstrapped and still empty.
  // We strip the query params after sending so a refresh doesn't replay
  // the seed into a new session.
  useEffect(() => {
    if (seedSentRef.current) return;
    if (!entry.seed) return;
    // Wait for bootstrap to fully resolve — sessionId becomes truthy
    // partway through, but bootstrapping=false is the all-clear that
    // sendMessage's internal `!sessionId` guard will pass.
    if (bootstrapping || !sessionId) return;
    if (messages.length > 0) return;
    seedSentRef.current = true;
    void sendMessage(entry.seed);
    const url = new URL(window.location.href);
    url.searchParams.delete("seed");
    url.searchParams.delete("new");
    const q = url.searchParams.toString();
    window.history.replaceState(
      {},
      "",
      url.pathname + (q ? `?${q}` : ""),
    );
  }, [entry.seed, bootstrapping, sessionId, messages.length, sendMessage]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    // Guest out of free messages — open the signup gate instead of sending
    // (keeps the typed text; the composer is locked anyway).
    if (signupRequired) {
      openSignupGate();
      return;
    }
    setInput("");
    await sendMessage(trimmed);
  }

  // Sidebar swaps conversations in-place via useChat.switchSession —
  // it updates the URL with history.pushState (so refresh + back-button
  // still work) and re-runs the bootstrap effect against the new
  // session_id. No full page reload, no welcome-state flash.
  // Hide the welcome screen while bootstrapping so the initial load
  // (and every subsequent switch) doesn't flash the empty-state UI
  // before the real messages arrive.
  const isEmpty = !bootstrapping && messages.length === 0 && !bootstrapError;

  return (
    // h-[100dvh] tracks the iOS Safari dynamic viewport (collapsing URL
    // bar) where h-screen / 100vh would over-extend behind the bottom
    // chrome and push the composer behind the home indicator.
    <div className="flex h-[100dvh] overflow-hidden bg-white">
      <ChatSidebar
        activeId={sessionId ?? undefined}
        language={language}
        onNew={(id) => switchSession(id)}
        onSelect={(id) => switchSession(id)}
        onDeleteActive={() => {
          // Active conversation was deleted — fall back to "newest
          // active or create one" by switching with no session_id.
          switchSession(null);
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 pt-safe backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2 py-4 text-sm font-medium text-gray-900">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label={cs.historyAria}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 md:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <Sparkles className="h-4 w-4 shrink-0 text-[#0F2747]" strokeWidth={1.75} />
            <span className="truncate">Sourcing concierge</span>
          </div>
          <div className="flex shrink-0 items-center gap-3 py-4">
            <a
              href="/"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Exit
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {bootstrapError ? (
            <div className="mx-auto flex h-full max-w-2xl items-center justify-center px-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-900">
                {bootstrapError}
              </div>
            </div>
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
                    <h1 className="text-center text-3xl font-semibold tracking-[-0.015em] text-gray-900 sm:text-4xl">
                      What machinery are you sourcing?
                    </h1>
                    <p className="mt-3 text-center text-base text-gray-500">
                      Describe what you need in your own words. The agent will
                      qualify the requirements.
                    </p>

                    <div className="mt-10">
                      <ChatComposer
                        value={input}
                        onChange={(v) => {
                        setInput(v);
                        if (v) notifyTyping();
                      }}
                        onSubmit={() => send(input)}
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
                          className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
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
                      <MessageBubble
                        key={m.id}
                        message={m}
                        reviewRequested={reviewRequested}
                        reviewSubmitting={reviewSubmitting}
                        onRequestReview={requestReview}
                        onRetry={retry}
                        retryDisabled={loading}
                        sessionLanguage={language}
                        onSuggestion={
                          i === messages.length - 1 && !loading && !signupRequired
                            ? send
                            : undefined
                        }
                      />
                    ))}
                    {(loading || otherIsTyping) && <TypingIndicator />}
                    <div ref={endRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {!isEmpty && !bootstrapError && (
          // pb-safe on the outer carves the home-indicator gap below the
          // composer's normal py-* rhythm — without the wrapper the inset
          // would override py-3 instead of adding to it.
          <div className="border-t border-gray-200 bg-white pb-safe">
            <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6 sm:py-4">
              {signupRequired ? (
                // Guest signup wall: the composer is replaced by a locked
                // "sign in to continue" bar so no further messages can be sent
                // without an account. Clicking it re-opens the AuthModal (which
                // also auto-opens once, on hitting the limit).
                <button
                  type="button"
                  onClick={openSignupGate}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#0F2747]/20 bg-[#0F2747]/[0.03] px-5 py-3.5 text-sm font-medium text-[#0F2747] transition-colors hover:border-[#0F2747]/40 hover:bg-[#0F2747]/[0.06]"
                >
                  <Lock className="h-4 w-4" strokeWidth={1.75} />
                  {cs.gateButton}
                </button>
              ) : (
                <ChatComposer
                  value={input}
                  onChange={setInput}
                  onSubmit={() => send(input)}
                  disabled={loading}
                  language={language}
                  placeholder={
                    reviewRequested ? cs.composerHandoff : cs.composerReply
                  }
                />
              )}
              <div className="mt-2 text-center text-[11px] text-gray-400">
                {signupRequired ? cs.gateHint : cs.composerHint}
              </div>
            </div>
          </div>
        )}
      </div>

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
        description="You've used your free preview messages. Sign in to keep chatting with your sourcing concierge — your conversation stays saved."
      />
    </div>
  );
}
