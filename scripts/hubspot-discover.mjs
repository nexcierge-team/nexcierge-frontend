#!/usr/bin/env node
/**
 * Discover the HubSpot IDs you need to fill in `.env.local`:
 *   - HUBSPOT_PIPELINE_ID
 *   - HUBSPOT_DEALSTAGE_NEW
 *   - HUBSPOT_DEFAULT_OWNER_ID
 *
 * Lists every Deal pipeline + its stages, then every owner. Pick the
 * IDs that match how you've set up HubSpot.
 *
 * Usage:
 *   node frontend/scripts/hubspot-discover.mjs <token>
 *   # or
 *   HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-... node frontend/scripts/hubspot-discover.mjs
 *
 * The token must be created manually in HubSpot UI — that part can't be
 * scripted (HubSpot won't issue tokens via API). See README in this
 * directory for the 30-second click path.
 */

const token = process.argv[2] || process.env.HUBSPOT_PRIVATE_APP_TOKEN;

if (!token) {
  console.error(
    "Missing token. Usage: node frontend/scripts/hubspot-discover.mjs <pat-na1-...>",
  );
  console.error("Get one: HubSpot → Settings → Integrations → Private Apps.");
  console.error("See frontend/scripts/README.md for required scopes.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function get(path) {
  const res = await fetch(`https://api.hubapi.com${path}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `${res.status} ${res.statusText} on ${path}\n${body.slice(0, 400)}`,
    );
  }
  return res.json();
}

function pad(str, n) {
  return String(str ?? "").padEnd(n);
}

try {
  // ── Deal pipelines + stages ──
  console.log("\n══════ Deal pipelines ══════\n");
  const pipelines = await get("/crm/v3/pipelines/deals");
  if (!pipelines.results?.length) {
    console.log("  (no pipelines — create one in HubSpot first)");
  } else {
    for (const p of pipelines.results) {
      console.log(`Pipeline: ${p.label}`);
      console.log(`  → HUBSPOT_PIPELINE_ID=${p.id}`);
      console.log(`  Stages (pick whichever represents 'new brief'):`);
      const stages = (p.stages ?? []).sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
      );
      for (const s of stages) {
        console.log(`    ${pad(s.label, 32)} → ${s.id}`);
      }
      console.log();
    }
  }

  // ── Owners ──
  console.log("══════ Owners ══════\n");
  const owners = await get("/crm/v3/owners");
  if (!owners.results?.length) {
    console.log("  (no owners — invite a teammate to HubSpot first)");
  } else {
    for (const o of owners.results) {
      const name =
        [o.firstName, o.lastName].filter(Boolean).join(" ") || "(no name)";
      const email = o.email || "(no email)";
      console.log(`  ${pad(name, 28)} ${pad(email, 36)} → ${o.id}`);
    }
  }

  console.log("\n══════ Drop into frontend/.env.local ══════\n");
  console.log(`HUBSPOT_PRIVATE_APP_TOKEN=${token.slice(0, 14)}…`);
  console.log("HUBSPOT_PIPELINE_ID=<pick from above>");
  console.log("HUBSPOT_DEALSTAGE_NEW=<pick the stage row from above>");
  console.log("HUBSPOT_DEFAULT_OWNER_ID=<pick the owner from above>");
  console.log();
} catch (err) {
  console.error("\nDiscovery failed:");
  console.error(err.message || err);
  if (String(err).includes("401")) {
    console.error(
      "\n→ Token is invalid or expired. Generate a new one in HubSpot.",
    );
  } else if (String(err).includes("403")) {
    console.error(
      "\n→ Token is missing scopes. Required: crm.objects.contacts.read/write,\n" +
        "  crm.objects.deals.read/write, crm.schemas.deals.read, crm.objects.owners.read.",
    );
  }
  process.exit(1);
}
