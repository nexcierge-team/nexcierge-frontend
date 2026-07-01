// `divider` is a full-width separator (not a bubble) used to mark the
// switch from AI conversation to account-manager conversation after
// handoff. `content` is the divider label.
export type ChatRole = "user" | "agent" | "divider";

// On agent messages, distinguishes the AI sourcing concierge ("agent",
// default) from the human account manager ("account_manager", post-handoff).
// Drives the small attribution label above the bubble.
export type MessageFrom = "agent" | "account_manager";

// "image" renders inline as a thumbnail; "file" renders as a downloadable
// card. Derived from the MIME type at upload time (see lib/attachments.ts).
export type AttachmentKind = "image" | "file";

// A document or media file an account manager attached to a chat message.
// Persisted in chat_messages.metadata.attachments. `path` is the object key
// inside the private `chat-attachments` Storage bucket — never a URL; the
// browser mints short-lived signed URLs on render via the buyer's / AM's own
// session (RLS-gated), so a leaked row can't be replayed for file access.
export interface Attachment {
  path: string;
  name: string;
  size: number;
  type: string;
  kind: AttachmentKind;
}

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  from?: MessageFrom;
  // Localised version of `content` produced at AM send time when the
  // buyer's session language is non-English. Renders as the primary
  // bubble text in the buyer view; the original English `content` is
  // shown below it as a muted secondary line.
  translatedContent?: string | null;
  // ISO 639-1 code the translation was produced for. The buyer UI only
  // honours translatedContent when this matches the current session
  // language — guards against stale translations if the buyer switches
  // language mid-session.
  translatedTo?: string | null;
  // AM-dashboard translations of `content` keyed by ISO 639-1 code,
  // hydrated from `chat_messages.metadata.translations`. Used only in the
  // account_manager view to render the thread in the AM's chosen working
  // language. Semantics of a value: a non-empty string is shown as the
  // translated secondary line; an empty string means "resolved, no
  // translation needed" (source already in the target language); a
  // missing key means "not fetched yet" and the dashboard requests it.
  translations?: Record<string, string>;
  // Snapshot of the buyer profile attached to an agent message whose
  // turn completed or updated the profile. Rendered as a summary card
  // below the bubble with a Request human review CTA.
  profileCard?: BuyerProfile;
  // True when this message is an agent reply produced because the API
  // call failed (network, 5xx, etc.). The UI renders a Retry button on it.
  error?: boolean;
  // ISO timestamp of when the recipient marked this message as read.
  // Only meaningful on messages SENT by the current viewer — drives
  // the "Read" indicator under outgoing bubbles.
  readAt?: string | null;
  // Documents / media attached to this message (account-manager replies
  // only). Hydrated from chat_messages.metadata.attachments. Rendered
  // below the bubble text by MessageAttachments, which signs each path.
  attachments?: Attachment[];
  // Quick-reply pills offered by the agent for THIS turn. Produced by the
  // backend's pill second pass (`chatbot.suggest_pills`) off the final reply
  // text, returned as `suggestions` from /chat. Only the latest agent message
  // renders them — past messages keep the data but the UI hides their pills
  // (clicking an old pill would re-send stale context). Session-only — not
  // persisted to chat_messages.
  suggestions?: string[];
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
