"use client";

import { useEffect, useState } from "react";
import { Download, FileText, ImageOff } from "lucide-react";
import type { Attachment } from "@/types/chat";
import { humanFileSize } from "@/lib/attachments";
import { signAttachmentUrls } from "@/lib/storage/attachments";
import { cn } from "@/lib/utils";

// Renders the documents / media attached to a message. Files in the private
// `chat-attachments` bucket aren't publicly reachable, so we mint short-lived
// signed URLs in the browser (RLS gates this to session members). Images show
// as clickable thumbnails; everything else is a download card. Used in both
// the buyer chat and the AM dashboard — both run the Supabase browser client.
export function MessageAttachments({
  attachments,
  align = "start",
}: {
  attachments: Attachment[];
  // Matches the bubble's alignment so cards/thumbs hug the right edge for
  // the viewer's own messages and the left edge for incoming ones.
  align?: "start" | "end";
}) {
  // path → signed URL. Absent until signing resolves; `signed` flips true
  // once the round-trip finishes so we can show a fallback for failures.
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    // A message's attachments are immutable once inserted, so this runs once
    // per bubble; we sign in the background and reveal on resolve. setState
    // only happens in the async callbacks (skeleton → image/card), never
    // synchronously in the effect body.
    let cancelled = false;
    signAttachmentUrls(attachments.map((a) => a.path))
      .then((map) => {
        if (cancelled) return;
        setUrls(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSigned(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attachments]);

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "end" ? "items-end" : "items-start",
      )}
    >
      {attachments.map((a) => {
        const url = urls[a.path];
        if (a.kind === "image") {
          return (
            <ImageAttachment key={a.path} att={a} url={url} signed={signed} />
          );
        }
        return <FileAttachment key={a.path} att={a} url={url} signed={signed} />;
      })}
    </div>
  );
}

function ImageAttachment({
  att,
  url,
  signed,
}: {
  att: Attachment;
  url?: string;
  signed: boolean;
}) {
  if (!url) {
    // Still signing → skeleton; signing finished without a URL → error tile.
    return (
      <div
        className={cn(
          "flex h-40 w-56 max-w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50",
          !signed && "animate-pulse",
        )}
      >
        {signed && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
            <ImageOff className="h-3.5 w-3.5" strokeWidth={1.75} />
            Couldn&apos;t load image
          </span>
        )}
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-opacity hover:opacity-95"
      title={att.name}
    >
      {/* Plain <img>, not next/image: signed Supabase URLs are one-off and
          expire, so they can't be a configured remote pattern. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={att.name}
        className="max-h-64 max-w-full object-contain"
      />
    </a>
  );
}

function FileAttachment({
  att,
  url,
  signed,
}: {
  att: Attachment;
  url?: string;
  signed: boolean;
}) {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0F2747]/5 text-[#0F2747]">
        <FileText className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-gray-900">
          {att.name}
        </span>
        <span className="block text-[11px] text-gray-400">
          {humanFileSize(att.size)}
        </span>
      </span>
      {url ? (
        <Download className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
      ) : signed ? (
        <span className="shrink-0 text-[10px] text-gray-400">unavailable</span>
      ) : (
        <span className="h-4 w-4 shrink-0 animate-pulse rounded bg-gray-200" />
      )}
    </>
  );

  const className =
    "flex w-64 max-w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]";

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={att.name}
        className={cn(className, "transition-colors hover:border-gray-300 hover:bg-gray-50")}
        title={`Download ${att.name}`}
      >
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
}
