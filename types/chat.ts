// `divider` is a full-width separator (not a bubble) used to mark the
// switch from AI conversation to account-manager conversation after
// handoff. `content` is the divider label.
export type ChatRole = "user" | "agent" | "divider";

// On agent messages, distinguishes the AI sourcing concierge ("agent",
// default) from the human account manager ("account_manager", post-handoff).
// Drives the small attribution label above the bubble.
export type MessageFrom = "agent" | "account_manager";

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  from?: MessageFrom;
  // Snapshot of the buyer profile attached to an agent message whose
  // turn completed or updated the profile. Rendered as a summary card
  // below the bubble with a Request human review CTA.
  profileCard?: BuyerProfile;
  // True when this message is an agent reply produced because the API
  // call failed (network, 5xx, etc.). The UI renders a Retry button on it.
  error?: boolean;
}

/**
 * Buyer profile collected by the agent's `update_buyer_profile` tool.
 * Mirrors the schema in `backend/app/chatbot.py::_empty_profile()`.
 * snake_case kept on purpose so we can pass the API response through
 * without transformation.
 */
export interface BuyerProfile {
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
    purchase_timeline: PurchaseTimeline | "";
    budget_range: string;
    compliance_requirements: string[];
    new_or_used_preference: NewOrUsedPreference | "";
  };
  service_preferences: {
    additional_notes: string;
  };
}

export type PurchaseTimeline =
  | "urgent_less_than_30_days"
  | "1_to_3_months"
  | "3_to_6_months"
  | "just_researching";

export type NewOrUsedPreference =
  | "new"
  | "used"
  | "refurbished"
  | "no_preference";

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
}
