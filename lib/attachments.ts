// Shared, runtime-agnostic helpers for chat attachments. Pure — NO browser
// or server-only imports — so it can be pulled into both the AM dashboard
// (client) and the messages Route Handler (server) without dragging the
// Supabase browser client into the server bundle. The actual upload / signed
// URL calls live in lib/storage/attachments.ts (browser only).

import type { Attachment, AttachmentKind } from "@/types/chat";

// Keep in sync with the bucket created in migration 0010 and the file input
// `accept` string below. Storage also enforces the size cap server-side, so
// these are UX guardrails + defense-in-depth, not the only line of defense.
export const ATTACHMENT_BUCKET = "chat-attachments";
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MiB
export const MAX_ATTACHMENTS_PER_MESSAGE = 8;

// Allowlisted by extension rather than MIME type: browsers report
// inconsistent / empty MIME types for Office docs and CSVs, so the
// extension is the more reliable gate. The picker is pre-filtered by
// ATTACHMENT_ACCEPT; this is the backstop on submit + on the server.
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  // images
  "png", "jpg", "jpeg", "gif", "webp",
  // documents
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip",
] as const;

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

// Drives the hidden <input type="file"> accept attribute on the composer.
export const ATTACHMENT_ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function isAllowedAttachment(name: string): boolean {
  const ext = fileExtension(name);
  return (ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext);
}

// "image" if the extension or MIME type says so; everything else is a
// generic file card.
export function attachmentKind(name: string, mime?: string): AttachmentKind {
  if (mime?.startsWith("image/")) return "image";
  return IMAGE_EXTENSIONS.has(fileExtension(name)) ? "image" : "file";
}

// Make a filename safe to embed in a Storage object key: strip directory
// separators and anything outside a conservative charset, collapse repeats,
// and cap the length so the full path stays well under Storage's key limit.
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._]+/, "");
  const safe = cleaned || "file";
  return safe.length > 120 ? safe.slice(-120) : safe;
}

// Pull the attachment list out of a chat_messages.metadata blob for
// rendering. Lenient (display path): tolerates partial / legacy rows and
// returns undefined when there's nothing to show, so callers can leave
// Message.attachments unset.
export function attachmentsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Attachment[] | undefined {
  const raw = (metadata as { attachments?: unknown } | null)?.attachments;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: Attachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    if (typeof a.path !== "string" || typeof a.name !== "string") continue;
    out.push({
      path: a.path,
      name: a.name,
      size: typeof a.size === "number" ? a.size : 0,
      type: typeof a.type === "string" ? a.type : "",
      kind: a.kind === "image" ? "image" : "file",
    });
  }
  return out.length > 0 ? out : undefined;
}

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

// Server-side validation of attachment metadata posted by the AM client.
// We never trust the client's `path`: it must live under THIS session's
// folder, so a tampered request can't point a message at another session's
// objects. Returns the cleaned list (capped) or null if anything is invalid.
export function validateAttachments(
  raw: unknown,
  sessionId: string,
): Attachment[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  if (raw.length > MAX_ATTACHMENTS_PER_MESSAGE) return null;
  const prefix = `${sessionId}/`;
  const out: Attachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const a = item as Record<string, unknown>;
    const path = a.path;
    const name = a.name;
    const size = a.size;
    const type = a.type;
    if (typeof path !== "string" || !path.startsWith(prefix)) return null;
    if (path.includes("..")) return null;
    if (typeof name !== "string" || !name.trim()) return null;
    if (typeof size !== "number" || size < 0 || size > MAX_ATTACHMENT_BYTES)
      return null;
    if (typeof type !== "string") return null;
    out.push({
      path,
      name: name.slice(0, 200),
      size,
      type,
      kind: attachmentKind(name, type),
    });
  }
  return out;
}
