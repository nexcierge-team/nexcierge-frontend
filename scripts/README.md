# Setup scripts

## `hubspot-discover.mjs`

Lists every Deal pipeline + stage + owner in your HubSpot account so you can pick the IDs for `.env.local` without clicking through the UI.

### Step 1 — Get the token (manual, ~30 seconds)

HubSpot won't issue private-app tokens via API, so this one step has to happen in their UI:

1. HubSpot → **Settings** (gear icon, top-right) → **Integrations → Private Apps**.
2. **Create a private app**.
3. **Basic info** tab → name it `Nexcierge backend`.
4. **Scopes** tab → enable these (and nothing else):
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.schemas.deals.read`
   - `crm.objects.owners.read`
5. **Create app** → confirm → copy the access token (starts with `pat-na1-…`).

### Step 2 — Run the discovery script

From the workspace root:

```bash
node frontend/scripts/hubspot-discover.mjs pat-na1-your-token-here
```

You'll get output like:

```
══════ Deal pipelines ══════

Pipeline: Sourcing
  → HUBSPOT_PIPELINE_ID=12345678
  Stages (pick whichever represents 'new brief'):
    New brief                        → 98765432
    Quoting                          → 98765433
    Won                              → 98765434
    Lost                             → 98765435

══════ Owners ══════

  Sara Lee                     sara@nexcierge.com                   → 54321
  Operations Bot               ops@nexcierge.com                    → 54322
```

### Step 3 — Paste into `frontend/.env.local`

```
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-your-token-here
HUBSPOT_PIPELINE_ID=12345678
HUBSPOT_DEALSTAGE_NEW=98765432
HUBSPOT_DEFAULT_OWNER_ID=54321
HUBSPOT_ENABLED=true
```

### Step 4 — Create the custom Deal properties

The `/api/request-review` handler writes 9 custom Deal properties when it creates a deal. Without them HubSpot 400s on unknown fields.

**Automated path (recommended):**
```bash
node frontend/scripts/hubspot-create-properties.mjs pat-na1-your-token-here
```

Idempotent — re-runs safely. Output:
```
✓ machine_type                 created
✓ intended_application         created
= delivery_country             (already exists, skipped)
...
Done. 7 created, 2 already existed. Total: 9.
```

**Manual path** (HubSpot UI → Settings → Properties → Deal properties → Create):

| Internal name | Type | Notes |
|---|---|---|
| `machine_type` | Single-line text | |
| `intended_application` | Single-line text | |
| `delivery_country` | Single-line text | |
| `delivery_city_or_port` | Single-line text | |
| `purchase_timeline` | Dropdown | Options: `urgent_less_than_30_days`, `1_to_3_months`, `3_to_6_months`, `just_researching` |
| `quantity` | Single-line text | |
| `compliance_requirements` | Multi-line text | Comma-joined list |
| `new_or_used_preference` | Dropdown | Options: `new`, `used`, `refurbished`, `no_preference` |
| `technical_specifications` | Multi-line text | JSON string |

Standard Contact properties used (no custom work needed): `email`, `firstname`, `lastname`, `company`, `phone`, `jobtitle`.
