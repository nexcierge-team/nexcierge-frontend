// Server-side client for one AI interview turn against the FastAPI
// backend. SERVER ONLY (it sends the shared backend secret).
//
// Prefers the streaming endpoint POST /chat/stream (NDJSON, see
// backend/docs/API.md). If the backend predates it (404/405 during a
// rollout where the frontend deploys first), it falls back to the legacy
// JSON POST /chat and replays the result as the same event sequence, so
// callers have exactly one code path.

import { BACKEND_URL, backendHeaders } from "@/lib/backend";
import { readNdjson } from "@/lib/ndjson";
import type { ProfileShape } from "@/lib/db/rfqs";

export type BackendTurnEvent =
  | { type: "delta"; text: string }
  | {
      type: "reply_done";
      reply: string;
      profile: ProfileShape;
      profile_complete: boolean;
    }
  | { type: "pills"; suggestions: string[]; reply_language: string }
  | { type: "error"; code: string; retryable: boolean }
  | { type: "done" };

export class BackendUnavailableError extends Error {}

/**
 * Open a turn. Resolves once the backend has accepted the request
 * (response headers received), so callers can still return a plain JSON
 * error if it fails before any event exists. Throws
 * BackendUnavailableError on a non-2xx status or a network failure.
 *
 * `timeoutMs` bounds the WHOLE turn, body included: AbortSignal.timeout
 * also aborts an in-progress body read.
 */
export async function openBackendTurn(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<AsyncGenerator<BackendTurnEvent>> {
  const signal = AbortSignal.timeout(timeoutMs);
  const init = {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  } as const;

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/chat/stream`, {
      ...init,
      headers: backendHeaders({ Accept: "application/x-ndjson" }),
    });
  } catch (e) {
    throw new BackendUnavailableError(`backend unreachable: ${String(e)}`);
  }

  if (res.status === 404 || res.status === 405) {
    void res.body?.cancel().catch(() => {});
    return legacyTurn(init);
  }
  if (!res.ok || !res.body) {
    void res.body?.cancel().catch(() => {});
    throw new BackendUnavailableError(`backend ${res.status}`);
  }
  return readNdjson<BackendTurnEvent>(res.body);
}

async function legacyTurn(init: {
  method: "POST";
  body: string;
  signal: AbortSignal;
}): Promise<AsyncGenerator<BackendTurnEvent>> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/chat`, {
      ...init,
      headers: backendHeaders(),
    });
  } catch (e) {
    throw new BackendUnavailableError(`backend unreachable: ${String(e)}`);
  }
  if (!res.ok) throw new BackendUnavailableError(`backend ${res.status}`);
  const data = (await res.json()) as {
    reply?: string;
    profile: ProfileShape;
    profile_complete?: boolean;
    suggestions?: string[];
    reply_language?: string;
  };
  return (async function* (): AsyncGenerator<BackendTurnEvent> {
    const reply = data.reply ?? "";
    if (reply) yield { type: "delta", text: reply };
    yield {
      type: "reply_done",
      reply,
      profile: data.profile,
      profile_complete: Boolean(data.profile_complete),
    };
    yield {
      type: "pills",
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      reply_language: data.reply_language ?? "en",
    };
    yield { type: "done" };
  })();
}
