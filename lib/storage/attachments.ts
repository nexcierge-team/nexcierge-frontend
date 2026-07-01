// Browser-only Storage calls for chat attachments. The AM's browser uploads
// files straight to Supabase Storage (bypassing our server, so big files
// don't hit the serverless request-body limit), then POSTs only the metadata
// to /api/am/sessions/[id]/messages. Reads go through short-lived signed URLs
// minted with the viewer's own session — RLS (migration 0010) restricts both
// the upload folder and the read to session members.

import { getSupabaseBrowser } from "@/lib/supabase/browser";
import {
  ATTACHMENT_BUCKET,
  attachmentKind,
  sanitizeFilename,
} from "@/lib/attachments";
import type { Attachment } from "@/types/chat";

// Composer-side state for a file the AM has picked but not yet sent. Lives
// only in the dashboard's local state; never persisted.
export interface PendingAttachment {
  id: string; // local-only id for list keys / removal
  file: File;
  name: string;
  size: number;
  uploading: boolean;
  // Set once the upload to Storage succeeds — this is what we send.
  uploaded?: Attachment;
  // Set when the file is rejected (too big / wrong type) or the upload
  // failed; carries a short human reason for the chip.
  error?: string;
}

// How long minted signed URLs stay valid. Long enough to view/download an
// open thread, short enough that a copied URL stops working soon after.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// Upload one file into the session's folder and return its Attachment
// metadata. Throws on failure (caller flags the chip).
export async function uploadAttachment(
  sessionId: string,
  file: File,
): Promise<Attachment> {
  const supabase = getSupabaseBrowser();
  const path = `${sessionId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  const contentType = file.type || "application/octet-stream";
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType, cacheControl: "3600", upsert: false });
  if (error) throw error;
  return {
    path,
    name: file.name,
    size: file.size,
    type: contentType,
    kind: attachmentKind(file.name, contentType),
  };
}

// Sign a batch of object paths in one round-trip. Returns a path→URL map;
// paths that fail to sign are simply absent (caller renders a fallback).
export async function signAttachmentUrls(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) {
      map[item.path] = item.signedUrl;
    }
  }
  return map;
}
