import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./env";

/**
 * Fire-and-forget broadcast to all subscribers of a chat session
 * channel. Uses Supabase's REST broadcast endpoint so no WebSocket
 * subscription is required from the server side — one HTTP call per
 * event, stateless, fast.
 *
 * Used when we can't trust `postgres_changes` UPDATE events to reach
 * every subscriber (the read-receipt UPDATE flow has shown this to be
 * unreliable across distinct auth contexts).
 *
 * Server-runtime only. Throws if env vars are missing.
 */
export async function broadcastToSession(
  sessionId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const url = `${SUPABASE_URL()}/realtime/v1/api/broadcast`;
  const key = SUPABASE_SERVICE_ROLE_KEY();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          topic: `session:${sessionId}`,
          event,
          payload,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      `realtime broadcast failed: ${res.status} ${res.statusText}`,
      body.slice(0, 200),
    );
  }
}
