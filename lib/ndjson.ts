// Minimal NDJSON (newline-delimited JSON) reader shared by the server
// (reading the backend's /chat/stream) and the browser (reading
// /api/chat). One JSON object per line. Blank lines are skipped, and a
// malformed line is logged and skipped rather than killing the stream.
// No server-only imports, so it's safe in "use client" code.

export async function* readNdjson<T = unknown>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      // stream:true keeps a multi-byte character split across chunks intact.
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          yield JSON.parse(line) as T;
        } catch {
          console.error("ndjson: skipping malformed line");
        }
      }
    }
    buf += decoder.decode();
    const tail = buf.trim();
    if (tail) {
      try {
        yield JSON.parse(tail) as T;
      } catch {
        console.error("ndjson: skipping malformed trailing line");
      }
    }
  } finally {
    // Early exit by the consumer (break / return) cancels the underlying
    // body so the upstream connection is released promptly.
    reader.cancel().catch(() => {});
  }
}
