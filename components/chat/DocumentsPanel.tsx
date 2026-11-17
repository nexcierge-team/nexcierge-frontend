"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Image as ImageIcon, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileExtension, humanFileSize } from "@/lib/attachments";
import { signAttachmentUrls } from "@/lib/storage/attachments";
import { PROGRESS_EN } from "@/lib/progressStrings";
import type { Attachment, Message } from "@/types/chat";

// Documents tab of a request: every file the account manager attached in
// THIS request's chat, newest first, as an order-file list (tag, name,
// meta, download). Derived from the already-loaded messages
// (chat_messages.metadata.attachments), so it needs no table or request
// of its own; signed URLs are minted in one batch when the tab opens.

export interface RequestDocument {
  attachment: Attachment;
  messageId: string;
  createdAt?: string;
}

// Messages are chronological; documents read newest first.
export function documentsFromMessages(messages: Message[]): RequestDocument[] {
  const out: RequestDocument[] = [];
  for (const m of messages) {
    if (!m.attachments) continue;
    for (const a of m.attachments) {
      out.push({ attachment: a, messageId: m.id, createdAt: m.createdAt });
    }
  }
  return out.reverse();
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function DocumentsPanel({
  documents,
  isDraft,
  onShowInChat,
}: {
  documents: RequestDocument[];
  // Pre-handoff: explain that files come after review, not "none yet".
  isDraft: boolean;
  onShowInChat: (messageId: string) => void;
}) {
  const ps = PROGRESS_EN;
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [signedKey, setSignedKey] = useState<string | null>(null);

  // One signing round-trip per distinct document set.
  const key = useMemo(
    () => documents.map((d) => d.attachment.path).join("|"),
    [documents],
  );
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    signAttachmentUrls(key.split("|"))
      .then((map) => {
        if (!cancelled) setUrls(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSignedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  const signed = signedKey === key;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PanelHeading title={ps.documentsTitle} lead={ps.documentsLead} />

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" strokeWidth={1.5} />}
          text={isDraft ? ps.documentsEmptyDraft : ps.documentsEmpty}
        />
      ) : (
        <ol className="mt-5 border-[1.5px] border-ink bg-sheet">
          {documents.map((d, i) => {
            const a = d.attachment;
            const url = urls[a.path];
            const ext = fileExtension(a.name).toUpperCase();
            const meta = [ext, humanFileSize(a.size), formatDate(d.createdAt)]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={`${d.messageId}:${a.path}`}
                className="row-in grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule px-3.5 py-3 last:border-b-0 sm:gap-4"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <span
                  className={cn(
                    "type-data inline-flex items-center gap-1 rounded-[2px] border-[1.5px] border-ink px-2 py-[3px] text-[12px] font-bold",
                  )}
                >
                  {a.kind === "image" ? (
                    <ImageIcon className="h-3 w-3" strokeWidth={2} aria-hidden />
                  ) : (
                    <FileText className="h-3 w-3" strokeWidth={2} aria-hidden />
                  )}
                  {a.kind === "image" ? ps.documentTag.image : ps.documentTag.file}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink" title={a.name}>
                    {a.name}
                  </span>
                  <span className="type-data mt-0.5 block truncate text-xs text-gray-500">
                    {meta}
                    <span className="hidden sm:inline"> · {ps.documentFrom}</span>
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onShowInChat(d.messageId)}
                    aria-label={`${ps.showInChat}: ${a.name}`}
                    title={ps.showInChat}
                    className="hidden h-8 w-8 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint sm:flex"
                  >
                    <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={a.name}
                      className="inline-flex items-center gap-1.5 rounded-sm border-[1.5px] border-ink bg-white px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint"
                    >
                      <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span className="hidden sm:inline">{ps.documentDownload}</span>
                    </a>
                  ) : signed ? (
                    <span className="type-data text-xs text-gray-500">
                      {ps.documentUnavailable}
                    </span>
                  ) : (
                    <span className="h-7 w-20 animate-pulse rounded-sm bg-ink/10" />
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function PanelHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <div>
      <h2 className="type-title text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">{lead}</p>
    </div>
  );
}

export function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mt-5 flex flex-col items-center gap-3 border-[1.5px] border-dashed border-rule-strong bg-sheet px-6 py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/10 text-ink">
        {icon}
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}
