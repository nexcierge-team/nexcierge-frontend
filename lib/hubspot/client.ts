import { Client } from "@hubspot/api-client";

// Lazily-instantiated HubSpot Private App client. Throws clearly when
// HUBSPOT_PRIVATE_APP_TOKEN is missing so the failure surfaces in a 500
// rather than a cryptic SDK error 3 frames deep.
//
// Server-runtime only — never import from a "use client" file.
let _client: Client | null = null;

export function getHubspotClient(): Client {
  if (_client) return _client;
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    throw new Error(
      "HUBSPOT_PRIVATE_APP_TOKEN is not set — see frontend/.env.example.",
    );
  }
  _client = new Client({ accessToken: token });
  return _client;
}

export function hubspotEnabled(): boolean {
  // Feature flag so local dev can short-circuit HubSpot writes without
  // unsetting the token (handy when debugging the handoff UX).
  if (process.env.HUBSPOT_ENABLED === "false") return false;
  return Boolean(process.env.HUBSPOT_PRIVATE_APP_TOKEN);
}
