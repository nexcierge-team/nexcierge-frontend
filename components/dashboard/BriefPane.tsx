"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { MessageBubble, TypingIndicator } from "@/components/chat/MessageBubble";
import { AM_BRIEF_EN } from "@/lib/amBriefStrings";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENTS_PER_MESSAGE } from "@/lib/attachments";
import type { PendingAttachment } from "@/lib/storage/attachments";
import type { LeadQuality } from "@/lib/supabase/types";
import { BriefSummary } from "./BriefSummary";
import { LanguageSelector } from "./LanguageSelector";
import type { OpenBrief } from "./types";

// Full brief view: chat thread + composer on the left, the read-only
// brief details / CRM / rating sidebar on the right.
export function BriefPane({
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
  const chrome = AM_BRIEF_EN;
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
            aria-label="Back to overview"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
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
                  placeholder={sending ? "Sending…" : "Message the buyer…"}
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
          sessionId={brief.sessionId}
          canRate={assignedToMe}
          onSaveRating={onSaveRating}
          onGenerateLessons={onGenerateLessons}
        />
      </div>
    </>
  );
}
