// Thin wrapper around the FastAPI /translate endpoint. Used by the AM
// message-send route to localise account-manager replies into the
// buyer's chosen language before they hit the database. Keeping the
// Gemini key on the backend (where it already lives) means we don't
// need to add @google/genai or another secret to the Next.js side.

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Hard cap on the translation round-trip. Flash-Lite usually answers in
// ~1s; if it takes longer than 8s something is wrong and the AM
// shouldn't wait — we fall back to sending the original English.
const TRANSLATE_TIMEOUT_MS = 8_000;

export async function translateText(
  text: string,
  targetLanguage: string,
): Promise<string | null> {
  if (!text.trim() || !targetLanguage || targetLanguage === "en") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target_language: targetLanguage }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("translate backend returned", res.status);
      return null;
    }
    const data = (await res.json()) as { translated_text?: string };
    return data.translated_text ?? null;
  } catch (e) {
    console.error("translate call failed:", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
