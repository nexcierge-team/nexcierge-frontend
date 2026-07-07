import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadQuality, RfqsRow } from "@/lib/supabase/types";

// See note in lib/db/messages.ts about the untyped client. Same applies here.
type Client = SupabaseClient;

// Default empty profile state. Mirrors backend/app/chatbot.py::_empty_profile()
// flattened to the rfqs row shape. Used when creating a fresh rfq.
export function emptyRfqFields(): Partial<RfqsRow> {
  return {
    full_name: "",
    company_name: "",
    business_email: "",
    phone_number: "",
    job_role: "",
    machine_type: "",
    intended_application: "",
    technical_specifications: {},
    quantity: "",
    delivery_country: "",
    delivery_city_or_port: "",
    purchase_timeline: "",
    budget_range: "",
    electrical_requirements: "",
    compliance_requirements: [],
    new_or_used_preference: "",
    additional_notes: "",
    status: "in_progress",
  };
}

export async function getRfq(
  supabase: Client,
  sessionId: string,
): Promise<RfqsRow | null> {
  const { data, error } = await supabase
    .from("rfqs")
    .select("*")
    .eq("chat_session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Identity columns we carry over from a returning buyer's previous RFQ.
// Request-specific fields (machine_type, delivery_*, etc.) are always
// re-collected — only the buyer themselves is stable across sessions.
type BuyerIdentity = Pick<
  RfqsRow,
  "full_name" | "company_name" | "business_email" | "phone_number" | "job_role"
>;

// Returns the buyer_info subset of this user's most recent RFQ that
// reached the identity step (business_email filled). Null on first-time
// buyers. Used by createRfq to prefill a fresh row so the agent doesn't
// re-ask name/company/email every session.
export async function getLatestBuyerIdentity(
  supabase: Client,
  userId: string,
): Promise<BuyerIdentity | null> {
  const { data, error } = await supabase
    .from("rfqs")
    .select("full_name, company_name, business_email, phone_number, job_role")
    .eq("user_id", userId)
    .neq("business_email", "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as BuyerIdentity | null;
}

export async function createRfq(
  supabase: Client,
  args: { sessionId: string; userId: string },
): Promise<RfqsRow> {
  const prior = await getLatestBuyerIdentity(supabase, args.userId);
  const { data, error } = await supabase
    .from("rfqs")
    .insert({
      chat_session_id: args.sessionId,
      user_id: args.userId,
      ...emptyRfqFields(),
      ...(prior ?? {}),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Apply only the fields the backend marked changed. Pass the full
// updated rfq from FastAPI's response; this helper writes the editable
// columns and ignores bookkeeping (id, user_id, created_at, etc.).
export async function updateRfqFields(
  supabase: Client,
  sessionId: string,
  rfq: Partial<RfqsRow>,
): Promise<RfqsRow> {
  const editable: Partial<RfqsRow> = {
    full_name: rfq.full_name,
    company_name: rfq.company_name,
    business_email: rfq.business_email,
    phone_number: rfq.phone_number,
    job_role: rfq.job_role,
    machine_type: rfq.machine_type,
    intended_application: rfq.intended_application,
    technical_specifications: rfq.technical_specifications,
    quantity: rfq.quantity,
    delivery_country: rfq.delivery_country,
    delivery_city_or_port: rfq.delivery_city_or_port,
    purchase_timeline: rfq.purchase_timeline,
    budget_range: rfq.budget_range,
    electrical_requirements: rfq.electrical_requirements,
    compliance_requirements: rfq.compliance_requirements,
    new_or_used_preference: rfq.new_or_used_preference,
    additional_notes: rfq.additional_notes,
  };
  // Strip undefined so we don't overwrite a server-only column with NULL
  for (const k of Object.keys(editable) as (keyof RfqsRow)[]) {
    if (editable[k] === undefined) delete editable[k];
  }
  const { data, error } = await supabase
    .from("rfqs")
    .update(editable)
    .eq("chat_session_id", sessionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ──────────────────────────────────────────────────────────────
// Row ↔ nested-profile conversion
//
// Backend (FastAPI / Gemini tool) speaks the nested shape:
//   { buyer_info: {...}, purchase_request: {...}, service_preferences: {...} }
// The DB stores it flat. These helpers translate at the boundary.
// ──────────────────────────────────────────────────────────────

export interface ProfileShape {
  buyer_info: {
    full_name: string;
    company_name: string;
    business_email: string;
    phone_number: string;
    job_role: string;
  };
  purchase_request: {
    machine_type: string;
    intended_application: string;
    technical_specifications: Record<string, string>;
    quantity: string;
    delivery_country: string;
    delivery_city_or_port: string;
    purchase_timeline: string;
    budget_range: string;
    electrical_requirements: string;
    compliance_requirements: string[];
    new_or_used_preference: string;
  };
  service_preferences: {
    additional_notes: string;
  };
}

export function rfqRowToProfile(row: RfqsRow): ProfileShape {
  return {
    buyer_info: {
      full_name: row.full_name,
      company_name: row.company_name,
      business_email: row.business_email,
      phone_number: row.phone_number,
      job_role: row.job_role,
    },
    purchase_request: {
      machine_type: row.machine_type,
      intended_application: row.intended_application,
      technical_specifications: row.technical_specifications,
      quantity: row.quantity,
      delivery_country: row.delivery_country,
      delivery_city_or_port: row.delivery_city_or_port,
      purchase_timeline: row.purchase_timeline,
      budget_range: row.budget_range,
      electrical_requirements: row.electrical_requirements,
      compliance_requirements: row.compliance_requirements,
      new_or_used_preference: row.new_or_used_preference,
    },
    service_preferences: {
      additional_notes: row.additional_notes,
    },
  };
}

export function profileToRfqUpdate(profile: ProfileShape): Partial<RfqsRow> {
  return {
    full_name: profile.buyer_info.full_name,
    company_name: profile.buyer_info.company_name,
    business_email: profile.buyer_info.business_email,
    phone_number: profile.buyer_info.phone_number,
    job_role: profile.buyer_info.job_role,
    machine_type: profile.purchase_request.machine_type,
    intended_application: profile.purchase_request.intended_application,
    technical_specifications: profile.purchase_request.technical_specifications,
    quantity: profile.purchase_request.quantity,
    delivery_country: profile.purchase_request.delivery_country,
    delivery_city_or_port: profile.purchase_request.delivery_city_or_port,
    purchase_timeline: profile.purchase_request.purchase_timeline,
    budget_range: profile.purchase_request.budget_range,
    electrical_requirements: profile.purchase_request.electrical_requirements,
    compliance_requirements: profile.purchase_request.compliance_requirements,
    new_or_used_preference: profile.purchase_request.new_or_used_preference,
    additional_notes: profile.service_preferences.additional_notes,
  };
}

/**
 * Bulk reassign every rfq owned by `fromUserId` to `toUserId`.
 * Counterpart to transferSessionsOwnership; used by /auth/callback.
 */
export async function transferRfqsOwnership(
  supabase: Client,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("rfqs")
    .update({ user_id: toUserId })
    .eq("user_id", fromUserId);
  if (error) throw error;
}

// AM's verdict on the AI interview's output (the Path-1/2 improvement
// loop's ground-truth label). Re-rating overwrites — the latest verdict
// wins; lead_rated_by/at record who judged last.
export async function rateRfqLead(
  supabase: Client,
  sessionId: string,
  args: {
    quality: LeadQuality;
    fieldIssues: string[];
    notes: string;
    ratedBy: string;
  },
): Promise<RfqsRow> {
  const { data, error } = await supabase
    .from("rfqs")
    .update({
      lead_quality: args.quality,
      lead_quality_field_issues: args.fieldIssues,
      lead_quality_notes: args.notes,
      lead_rated_by: args.ratedBy,
      lead_rated_at: new Date().toISOString(),
    })
    .eq("chat_session_id", sessionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markRfqSubmitted(
  supabase: Client,
  sessionId: string,
  hubspotIds: { contactId: string | null; dealId: string | null },
): Promise<RfqsRow> {
  const { data, error } = await supabase
    .from("rfqs")
    .update({
      status: "submitted",
      hubspot_contact_id: hubspotIds.contactId,
      hubspot_deal_id: hubspotIds.dealId,
      submitted_at: new Date().toISOString(),
    })
    .eq("chat_session_id", sessionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
