#!/usr/bin/env node
/**
 * Idempotently create the custom Deal properties Nexcierge writes during
 * handoff (see lib/hubspot/sync.ts). Skips properties that already exist.
 *
 * Usage:
 *   node frontend/scripts/hubspot-create-properties.mjs <token>
 *   # or
 *   HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-... node frontend/scripts/hubspot-create-properties.mjs
 *
 * The token needs `crm.schemas.deals.read` AND write. The Private App
 * scope checkbox is labeled "Deals" with both read + write — make sure
 * the WRITE checkbox is on, or the create call 403s.
 */

const token = process.argv[2] || process.env.HUBSPOT_PRIVATE_APP_TOKEN;

if (!token) {
  console.error(
    "Missing token. Usage: node frontend/scripts/hubspot-create-properties.mjs <pat-na1-...>",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

// Single source of truth for the custom Deal properties. The internal
// `name` values are referenced by name in lib/hubspot/sync.ts — keep in
// sync. `groupName: "dealinformation"` puts them in HubSpot's standard
// Deal-info section so the AM sees them inline on the deal record.
const PROPERTIES = [
  {
    name: "machine_type",
    label: "Machine type",
    type: "string",
    fieldType: "text",
    groupName: "dealinformation",
    description: "Buyer-provided machine category (e.g. injection molding machine).",
  },
  {
    name: "intended_application",
    label: "Intended application",
    type: "string",
    fieldType: "text",
    groupName: "dealinformation",
    description: "What the buyer will use the machine for.",
  },
  {
    name: "delivery_country",
    label: "Delivery country",
    type: "string",
    fieldType: "text",
    groupName: "dealinformation",
  },
  {
    name: "delivery_city_or_port",
    label: "Delivery city / port",
    type: "string",
    fieldType: "text",
    groupName: "dealinformation",
  },
  {
    name: "purchase_timeline",
    label: "Purchase timeline",
    type: "enumeration",
    fieldType: "select",
    groupName: "dealinformation",
    options: [
      { label: "Urgent — under 30 days", value: "urgent_less_than_30_days", displayOrder: 0 },
      { label: "1–3 months", value: "1_to_3_months", displayOrder: 1 },
      { label: "3–6 months", value: "3_to_6_months", displayOrder: 2 },
      { label: "Just researching", value: "just_researching", displayOrder: 3 },
    ],
  },
  {
    name: "quantity",
    label: "Quantity",
    type: "string",
    fieldType: "text",
    groupName: "dealinformation",
  },
  {
    name: "compliance_requirements",
    label: "Compliance requirements",
    type: "string",
    fieldType: "textarea",
    groupName: "dealinformation",
    description: "Comma-joined list (e.g. CE, UL, FDA, ISO).",
  },
  {
    name: "new_or_used_preference",
    label: "New / used preference",
    type: "enumeration",
    fieldType: "select",
    groupName: "dealinformation",
    options: [
      { label: "New", value: "new", displayOrder: 0 },
      { label: "Used", value: "used", displayOrder: 1 },
      { label: "Refurbished", value: "refurbished", displayOrder: 2 },
      { label: "No preference", value: "no_preference", displayOrder: 3 },
    ],
  },
  {
    name: "technical_specifications",
    label: "Technical specifications",
    type: "string",
    fieldType: "textarea",
    groupName: "dealinformation",
    description: "JSON string of spec key/value pairs collected by the AI agent.",
  },
];

async function listExistingNames() {
  const res = await fetch("https://api.hubapi.com/crm/v3/properties/deals", {
    headers,
  });
  if (!res.ok) {
    throw new Error(
      `Listing existing properties failed: ${res.status} ${res.statusText}\n${await res.text()}`,
    );
  }
  const data = await res.json();
  return new Set(data.results.map((p) => p.name));
}

async function createProperty(prop) {
  const res = await fetch("https://api.hubapi.com/crm/v3/properties/deals", {
    method: "POST",
    headers,
    body: JSON.stringify(prop),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Create ${prop.name} failed: ${res.status} ${res.statusText}\n${body.slice(0, 400)}`,
    );
  }
  return res.json();
}

try {
  const existing = await listExistingNames();
  let created = 0;
  let skipped = 0;
  for (const prop of PROPERTIES) {
    if (existing.has(prop.name)) {
      console.log(`= ${prop.name.padEnd(28)} (already exists, skipped)`);
      skipped++;
    } else {
      await createProperty(prop);
      console.log(`✓ ${prop.name.padEnd(28)} created`);
      created++;
    }
  }
  console.log(
    `\nDone. ${created} created, ${skipped} already existed. Total: ${PROPERTIES.length}.`,
  );
} catch (err) {
  console.error("\nFailed:");
  console.error(err.message || err);
  if (String(err).includes("403")) {
    console.error(
      "\n→ Token is missing `crm.schemas.deals.read` and/or write scope.",
    );
  }
  process.exit(1);
}
