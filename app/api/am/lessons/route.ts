import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { AgentLessonStatus } from "@/lib/supabase/types";

// Lessons review queue for the AM dashboard. Proposed first (the ones
// needing a human decision), then the reviewed history, both newest
// first. Optional ?status= filter; ?count=1 returns only { count }. RLS already scopes the table to AMs;
// the gate here just gives a clean 401/403 instead of an empty list.

const STATUSES = new Set<AgentLessonStatus>([
  "proposed",
  "approved",
  "rejected",
]);
const MAX_ROWS = 200;

export async function GET(req: Request) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") as AgentLessonStatus | null;
  const supabase = await getSupabaseServer();

  // ?count=1 → just the number of matching rows (the dashboard badge).
  // A head-only count query instead of shipping up to 200 full rows to
  // count them client-side.
  if (url.searchParams.get("count") === "1") {
    let countQuery = supabase
      .from("agent_lessons")
      .select("id", { count: "exact", head: true });
    if (statusParam && STATUSES.has(statusParam)) {
      countQuery = countQuery.eq("status", statusParam);
    }
    const { count, error } = await countQuery;
    if (error) {
      console.error("lessons count failed:", error);
      return NextResponse.json({ error: "Count failed" }, { status: 500 });
    }
    return NextResponse.json({ count: count ?? 0 });
  }

  let query = supabase
    .from("agent_lessons")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (statusParam && STATUSES.has(statusParam)) {
    query = query.eq("status", statusParam);
  }
  const { data, error } = await query;
  if (error) {
    console.error("lessons list failed:", error);
    return NextResponse.json({ error: "Listing failed" }, { status: 500 });
  }
  return NextResponse.json({ lessons: data ?? [] });
}
