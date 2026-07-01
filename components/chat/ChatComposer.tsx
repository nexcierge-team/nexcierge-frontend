"use client";

import { FormEvent, useEffect, useRef } from "react";
import { ArrowUp, Paperclip, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { chatStrings } from "@/lib/chatStrings";
import { humanFileSize } from "@/lib/attachments";
import type { PendingAttachment } from "@/lib/storage/attachments";

interface ChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  rows?: number;
  // Buyer's display language (ISO 639-1). Localizes the default placeholder
  // and the send button's aria-label. Defaults to English.
  language?: string;

  // ── Attachment affordances (AM dashboard only) ──
  // When provided, renders a paperclip button that opens a file picker and
  // calls back with the chosen files. Absent → composer is text-only
  // (the buyer chat).
  onAttach?: (files: File[]) => void;
  // The `accept` attribute for the hidden file input.
  attachAccept?: string;
  // Files picked but not yet sent, rendered as chips above the textarea.
  pendingAttachments?: PendingAttachment[];
  onRemoveAttachment?: (id: string) => void;
  // Disable just the attach button (e.g. at the per-message file cap).
  attachDisabled?: boolean;
  // Permit submit when the textarea is empty — used once at least one
  // attachment has finished uploading so an image/doc can be sent caption-less.
  allowEmptySubmit?: boolean;
  // Block submit without disabling the textarea (e.g. while an upload is
  // still in flight) so the AM can keep typing a caption.
  submitDisabled?: boolean;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  autoFocus,
  rows = 1,
  language,
  onAttach,
  attachAccept,
  pendingAttachments,
  onRemoveAttachment,
  attachDisabled,
  allowEmptySubmit,
  submitDisabled,
}: ChatComposerProps) {
  const cs = chatStrings(language);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }, [value]);

  const hasText = value.trim().length > 0;
  const canSubmit =
    !disabled && !submitDisabled && (hasText || allowEmptySubmit === true);

  function submit() {
    if (!canSubmit) return;
    onSubmit();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) onAttach?.(Array.from(files));
    // Reset so picking the same file again re-fires onChange.
    e.target.value = "";
  }

  const showAttach = !!onAttach;
  const pending = pendingAttachments ?? [];

  return (
    <form onSubmit={handleSubmit} className="relative">
      {pending.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pending.map((p) => (
            <AttachmentChip
              key={p.id}
              pending={p}
              onRemove={
                onRemoveAttachment ? () => onRemoveAttachment(p.id) : undefined
              }
            />
          ))}
        </div>
      )}

      {showAttach && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={attachAccept}
            onChange={handleFiles}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || attachDisabled}
            aria-label="Attach files"
            title="Attach documents or media"
            className="absolute left-2.5 bottom-2.5 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
          >
            <Paperclip className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </>
      )}

      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder ?? cs.composerDefault}
        // Auto direction so RTL languages (e.g. Arabic) align the placeholder
        // and the buyer's typing to the right without a hard-coded dir.
        dir="auto"
        rows={rows}
        className={cn(
          // text-base (16px) below sm: prevents iOS Safari from auto-zooming
          // when the textarea is focused — anything <16px triggers the zoom.
          // Desktop keeps the original tighter 15px.
          "w-full resize-none rounded-2xl border border-gray-200 bg-white px-5 py-3.5 pr-14 text-base text-gray-900 placeholder:text-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors focus:border-gray-400 focus:outline-none sm:text-[15px]",
          // Make room for the paperclip when the attach affordance is on.
          showAttach && "pl-12",
          // Hide the textarea's scrollbar (auto-resize handles vertical growth up to max-height)
          "scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        )}
      />
      <button
        type="submit"
        disabled={!canSubmit}
        aria-label={cs.sendAria}
        className="absolute right-2.5 bottom-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm transition-all duration-200 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2} />
      </button>
    </form>
  );
}

function AttachmentChip({
  pending,
  onRemove,
}: {
  pending: PendingAttachment;
  onRemove?: () => void;
}) {
  const error = !!pending.error;
  return (
    <span
      className={cn(
        "inline-flex max-w-[220px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
        error
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-gray-200 bg-gray-50 text-gray-700",
      )}
      title={pending.error || pending.name}
    >
      {pending.uploading ? (
        <Loader2
          className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400"
          strokeWidth={1.75}
        />
      ) : error ? (
        <AlertCircle
          className="h-3.5 w-3.5 shrink-0 text-red-500"
          strokeWidth={1.75}
        />
      ) : (
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.75} />
      )}
      <span className="min-w-0 truncate font-medium">{pending.name}</span>
      <span className="shrink-0 text-[10px] text-gray-400">
        {error ? pending.error : humanFileSize(pending.size)}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${pending.name}`}
          className="-mr-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
        >
          <X className="h-3 w-3" strokeWidth={2} />
        </button>
      )}
    </span>
  );
}
