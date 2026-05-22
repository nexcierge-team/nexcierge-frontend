import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts";
import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/deals";
import type { RfqsRow } from "@/lib/supabase/types";
import { getHubspotClient } from "./client";

export interface HubspotSyncResult {
  contactId: string;
  dealId: string;
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
  const searchRes = await hubspot.crm.contacts.searchApi.doSearch({
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

  const contactProps: Record<string, string> = {
    email: rfq.business_email,
    firstname: first,
    lastname: last,
    company: rfq.company_name,
    phone: rfq.phone_number,
    jobtitle: rfq.job_role,
  };

  if (searchRes.results.length > 0) {
    contactId = searchRes.results[0].id;
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
