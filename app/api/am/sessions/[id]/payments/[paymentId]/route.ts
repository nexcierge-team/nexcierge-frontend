import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSession } from "@/lib/db/sessions";
import { captureServer } from "@/lib/analytics";
import { PAYMENT_STATUSES } from "@/lib/payments";
import type { PaymentRequestsRow, PaymentStatus } from "@/lib/supabase/types";

// AM changes a payment link's status: mark it paid once funds land, cancel
// a link sent by mistake, or reopen (back to pending) to correct an error.
// Assigned AM only; RLS (migration 0027) enforces the same rule.

const STATUSES = new Set<string>(PAYMENT_STATUSES);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; paymentId: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id, paymentId } = await ctx.params;

  let body: { status?: unknown };
  try {
    body = (await req.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = body.status;
  if (typeof status !== "string" || !STATUSES.has(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${PAYMENT_STATUSES.join(" | ")}` },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServer();
  const session = await getSession(supabase, id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.assigned_am_user_id !== gate.userId) {
    return NextResponse.json(
      { error: "Claim this brief before updating payments" },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("payment_requests")
    .update({
      status: status as PaymentStatus,
      paid_at: status === "paid" ? now : null,
      updated_at: now,
    })
    .eq("id", paymentId)
    .eq("chat_session_id", id)
    .select()
    .maybeSingle();
  if (error) {
    console.error("payment request update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  captureServer(gate.userId, "am_payment_status_updated", {
    session_id: id,
    payment_id: (data as PaymentRequestsRow).id,
    status,
  });

  return NextResponse.json({ payment: data });
}
