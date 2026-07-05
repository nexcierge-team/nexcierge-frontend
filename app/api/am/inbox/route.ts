import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";

// AM inbox: every chat_session in handoff state, with the rfq summary
// inlined so the list view can show a "from / what" preview. Mix of
// "unclaimed" (assigned_am_user_id is null) and "mine" (= caller).
// Other AMs' active claims are intentionally hidden — Step 7 polish
// can add an "all team briefs" filter.
export async function GET() {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select(
      `
      id, status, handoff_requested_at, assigned_am_user_id, title, updated_at,
      rfqs:rfqs(full_name, company_name, business_email, machine_type,
                intended_application, quantity, delivery_country,
                delivery_city_or_port, purchase_timeline, hubspot_deal_id)
    `,
    )
    .eq("status", "in_handoff")
    .or(`assigned_am_user_id.is.null,assigned_am_user_id.eq.${gate.userId}`)
    .order("handoff_requested_at", { ascending: false });

  if (error) {
    console.error("am inbox query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  return NextResponse.json({ briefs: data ?? [] });
}
