import type {
  ChatMessagesRow,
  ChatSenderType,
  RfqsRow,
} from "@/lib/supabase/types";
import type { ChatRole, Message, MessageFrom } from "@/types/chat";
import { attachmentsFromMetadata } from "@/lib/attachments";

export type InboxRfq = Pick<
  RfqsRow,
  | "full_name"
  | "company_name"
  | "business_email"
  | "machine_type"
  | "intended_application"
  | "quantity"
  | "delivery_country"
  | "delivery_city_or_port"
  | "purchase_timeline"
  | "hubspot_deal_id"
>;

export interface InboxBrief {
  id: string;
  status: "in_handoff";
  handoff_requested_at: string | null;
  assigned_am_user_id: string | null;
  title: string | null;
  updated_at: string;
  // Embedded rfq via PostgREST nested select. chat_session→rfqs is 1:1
  // (unique FK), so PostgREST returns a single OBJECT — but older
  // versions returned an array, so read it through inboxRfq() only.
  rfqs: InboxRfq | InboxRfq[] | null;
}

// Normalise the embed shape (object vs single-element array) so no
// caller ever does `rfqs[0]` directly — that bug hid buyer data for
// months behind the old UI's silent title fallback.
export function inboxRfq(brief: InboxBrief): InboxRfq | null {
  if (!brief.rfqs) return null;
  return Array.isArray(brief.rfqs) ? (brief.rfqs[0] ?? null) : brief.rfqs;
}

export interface OpenBrief {
  sessionId: string;
  assignedToMe: boolean;
  rfq: RfqsRow;
  messages: Message[];
}

// Who holds a brief, relative to the signed-in AM. Drives the status
// pill in the briefs table and the Mine/Unclaimed tab filters.
export type ClaimStatus = "mine" | "unclaimed" | "other";

export function claimStatus(
  brief: InboxBrief,
  meId: string | null,
): ClaimStatus {
  if (!brief.assigned_am_user_id) return "unclaimed";
  return brief.assigned_am_user_id === meId ? "mine" : "other";
}

export function rowToMessage(row: ChatMessagesRow): Message {
  const senderRoleMap: Record<ChatSenderType, ChatRole> = {
    user: "user",
    ai: "agent",
    account_manager: "agent",
    system: "divider",
  };
  const from: MessageFrom | undefined =
    row.sender_type === "account_manager" ? "account_manager" : undefined;
  // AM-dashboard translations cached on the row (metadata.translations),
  // keyed by ISO 639-1 code. Hydrated so an already-translated thread
  // renders in the AM's language with no extra backend calls on reload.
  const cached = (
    row.metadata as { translations?: Record<string, string> } | null
  )?.translations;
  return {
    id: row.id,
    role: senderRoleMap[row.sender_type],
    content: row.content,
    from,
    readAt: row.read_at,
    translations:
      cached && typeof cached === "object" ? { ...cached } : undefined,
    attachments: attachmentsFromMetadata(row.metadata),
  };
}
