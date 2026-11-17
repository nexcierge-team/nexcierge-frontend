import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession } from "@/lib/db/sessions";
import { captureServer } from "@/lib/analytics";
import { validatePaymentInput } from "@/lib/payments";
import type { PaymentRequestsRow } from "@/lib/supabase/types";

// AM sends the buyer a payment link for this sourcing request (deposit,
// balance, inspection fee, ...). Rows live in payment_requests
// (migration 0027) and reach the buyer's Payments tab live via Realtime.
// The insert runs on the AM's own scoped client, so RLS is the real
// gate (assigned AM only); the explicit checks below just turn a silent
// RLS refusal into a clear status code.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = validatePaymentInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.assigned_am_user_id !== gate.userId) {
    return NextResponse.json(
      { error: "Claim this brief before sending a payment link" },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      chat_session_id: id,
      created_by: gate.userId,
      ...parsed.value,
    })
    .select()
    .single();
  if (error || !data) {
    console.error("payment request insert failed:", error);
    return NextResponse.json({ error: "Could not create payment link" }, { status: 500 });
  }

  // ids + enums only: never the label or URL (free text).
  captureServer(gate.userId, "am_payment_link_created", {
    session_id: id,
    payment_id: (data as PaymentRequestsRow).id,
    currency: parsed.value.currency,
  });

  return NextResponse.json({ payment: data }, { status: 201 });
}
