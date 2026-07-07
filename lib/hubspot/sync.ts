import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts";
import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/deals";
import type { RfqsRow } from "@/lib/supabase/types";
import { getHubspotClient } from "./client";

export interface HubspotSyncResult {
  contactId: string;
  dealId: string;
}

/**
 * Thrown when HubSpot rejects a write because one of the RFQ fields
 * fails its server-side validation (most commonly a typo'd email like
 * `user@gmail.coim`). Caller can convert this to a 422 and surface the
 * specific field to the buyer instead of silently failing.
 */
export class HubspotValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: string,
    public readonly hubspotCode: string,
    message: string,
  ) {
    super(message);
    this.name = "HubspotValidationError";
  }
}

// Type guard for the SDK's error shape — it's a plain Error subclass
// with `code` (HTTP status) and `body` (parsed JSON).
interface HubspotApiError {
  code: number;
  body: {
    category?: string;
    errors?: Array<{
      code: string;
      message: string;
      context?: { propertyName?: string[] };
    }>;
  };
}

function asHubspotApiError(e: unknown): HubspotApiError | null {
  if (!e || typeof e !== "object") return null;
  const candidate = e as Partial<HubspotApiError>;
  if (typeof candidate.code !== "number" || !candidate.body) return null;
  return candidate as HubspotApiError;
}

function maybeRethrowValidation(e: unknown, fallbackValue: string): never {
  const apiErr = asHubspotApiError(e);
  if (apiErr && apiErr.code === 400 && apiErr.body?.category === "VALIDATION_ERROR") {
    const first = apiErr.body.errors?.[0];
    if (first) {
      const field = first.context?.propertyName?.[0] ?? "unknown_field";
      const friendly =
        first.code === "INVALID_EMAIL"
          ? `The email address ${fallbackValue} looks invalid — please double-check it (common typos: .coim → .com, .con → .com, missing @).`
          : `HubSpot rejected the ${field} field: ${first.message}`;
      throw new HubspotValidationError(field, fallbackValue, first.code, friendly);
    }
  }
  throw e;
}

export interface SyncArgs {
  rfq: RfqsRow;
  // The buyer's full_name + email come from the rfq itself; we only
  // need anything *not* in the rfq from the user object today (nothing).
}

// First/last-name split for HubSpot's standard contact fields.
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// Best-effort budget parse: extracts the first integer from strings like
// "$10,000-$20,000" or "around 15k USD". Returns null on no match.
function parseBudgetAmount(raw: string): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d[\d,]*)\s*(k|m)?/i);
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ""));
  if (Number.isNaN(base)) return null;
  const suffix = match[2]?.toLowerCase();
  if (suffix === "k") return base * 1_000;
  if (suffix === "m") return base * 1_000_000;
  return base;
}

/**
 * Push a completed sourcing brief into HubSpot.
 *
 * 1. Upsert Contact by email (search → create if missing).
 * 2. Create Deal in the configured pipeline + stage, owned by the
 *    configured default account manager.
 * 3. Associate the Deal with the Contact.
 *
 * Caller is responsible for idempotency: check `rfq.hubspot_deal_id`
 * before calling. If non-null, skip — re-calling would create a
 * duplicate Deal.
 *
 * Requires custom Deal properties to exist in HubSpot — see
 * frontend/supabase/README.md for the spec. Property internal names
 * default to the snake_case of the rfq column; if your HubSpot UI
 * created them with different names, set the corresponding HUBSPOT_*
 * env var overrides (not implemented yet; add when needed).
 */
export async function syncBriefToHubspot(
  args: SyncArgs,
): Promise<HubspotSyncResult> {
  const { rfq } = args;
  const hubspot = getHubspotClient();
  const pipelineId = process.env.HUBSPOT_PIPELINE_ID;
  const dealstageId = process.env.HUBSPOT_DEALSTAGE_NEW;
  const ownerId = process.env.HUBSPOT_DEFAULT_OWNER_ID;
  if (!pipelineId || !dealstageId) {
    throw new Error(
      "HUBSPOT_PIPELINE_ID and HUBSPOT_DEALSTAGE_NEW must both be set",
    );
  }
  if (!rfq.business_email) {
    throw new Error("Cannot sync to HubSpot — rfq.business_email is empty");
  }

  // 1. Find or create Contact.
  const { first, last } = splitName(rfq.full_name);
  let contactId: string;
  let searchRes;
  try {
    searchRes = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: FilterOperatorEnum.Eq,
              value: rfq.business_email,
            },
          ],
        },
      ],
      properties: ["email"],
      sorts: [],
      limit: 1,
      after: "0",
    });
  } catch (e) {
    maybeRethrowValidation(e, rfq.business_email);
  }

  const contactProps: Record<string, string> = {
    email: rfq.business_email,
    firstname: first,
    lastname: last,
    company: rfq.company_name,
    phone: rfq.phone_number,
    jobtitle: rfq.job_role,
  };

  try {
    if (searchRes!.results.length > 0) {
      contactId = searchRes!.results[0].id;
      // Refresh fields in case the buyer updated their name/company.
      await hubspot.crm.contacts.basicApi.update(contactId, {
        properties: contactProps,
      });
    } else {
      const createRes = await hubspot.crm.contacts.basicApi.create({
        properties: contactProps,
        associations: [],
      });
      contactId = createRes.id;
    }
  } catch (e) {
    maybeRethrowValidation(e, rfq.business_email);
    // satisfies the compiler — maybeRethrowValidation always throws
    throw e;
  }

  // 2. Create the Deal.
  const dealProps: Record<string, string> = {
    dealname: `${rfq.machine_type || "Sourcing brief"} — ${rfq.company_name || rfq.full_name || rfq.business_email}`,
    pipeline: pipelineId,
    dealstage: dealstageId,
    // Custom Deal properties (must be pre-created in HubSpot UI, see
    // supabase/README.md for the spec).
    machine_type: rfq.machine_type,
    intended_application: rfq.intended_application,
    delivery_country: rfq.delivery_country,
    delivery_city_or_port: rfq.delivery_city_or_port,
    purchase_timeline: rfq.purchase_timeline,
    quantity: rfq.quantity,
    electrical_requirements: rfq.electrical_requirements,
    compliance_requirements: rfq.compliance_requirements.join(", "),
    new_or_used_preference: rfq.new_or_used_preference,
    technical_specifications: JSON.stringify(
      rfq.technical_specifications,
      null,
      2,
    ),
  };
  if (ownerId) dealProps.hubspot_owner_id = ownerId;
  const budget = parseBudgetAmount(rfq.budget_range);
  if (budget !== null) dealProps.amount = String(budget);

  const dealRes = await hubspot.crm.deals.basicApi.create({
    properties: dealProps,
    associations: [
      {
        to: { id: contactId },
        // 3 = HubSpot's standard "Deal → Contact" association type.
        types: [
          {
            associationCategory:
              AssociationSpecAssociationCategoryEnum.HubspotDefined,
            associationTypeId: 3,
          },
        ],
      },
    ],
  });

  return { contactId, dealId: dealRes.id };
}

/**
 * Move a HubSpot deal to a new pipeline stage. Used by the AM-claim
 * route to advance "Human Review Requested" → "Assigned to Account
 * Manager" the moment an AM picks up the brief, so the pipeline in
 * HubSpot reflects ground truth without a sales rep having to drag the
 * card across columns.
 *
 * Non-fatal contract: callers should swallow thrown errors. A failure
 * here is a CRM-reconciliation problem, not a reason to fail the
 * underlying user action (claim, status update, etc.).
 */
export async function advanceDealStage(
  dealId: string,
  stageId: string,
): Promise<void> {
  const hubspot = getHubspotClient();
  await hubspot.crm.deals.basicApi.update(dealId, {
    properties: { dealstage: stageId },
  });
}
