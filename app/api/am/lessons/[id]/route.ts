import { NextResponse } from "next/server";
import { requireAccountManager } from "@/lib/supabase/role";
import { getSupabaseServer } from "@/lib/supabase/server";
import { captureServer } from "@/lib/analytics";

// Review one proposed lesson: approve (optionally with an edited
// lesson_text) or reject. Approval is the human gate in the improvement
// loop — only approved lessons are candidates for future prompt changes,
// and nothing downstream acts on a lesson before this decision. A
// reviewed lesson can be re-reviewed (e.g. reject an approval made by
// mistake); reviewed_by/at always reflect the latest decision.

const MAX_LESSON_LENGTH = 1000;

interface PatchBody {
  action?: string;
  lesson_text?: string;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAccountManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }
  const { id } = await ctx.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json(
      { error: "action must be approve | reject" },
      { status: 400 },
    );
  }
  const editedText =
    typeof body.lesson_text === "string" ? body.lesson_text.trim() : "";
  if (body.action === "approve" && body.lesson_text !== undefined && !editedText) {
    return NextResponse.json(
      { error: "Edited lesson_text cannot be empty" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServer();
  const update: Record<string, unknown> = {
    status: body.action === "approve" ? "approved" : "rejected",
    reviewed_by: gate.userId,
    reviewed_at: new Date().toISOString(),
  };
  // Only an approval may rewrite the text — rejection keeps the draft
  // verbatim so the history shows what was actually turned down.
  if (body.action === "approve" && editedText) {
    update.lesson_text = editedText.slice(0, MAX_LESSON_LENGTH);
  }

  const { data, error } = await supabase
    .from("agent_lessons")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) {
    console.error("lesson review failed:", error);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  captureServer(gate.userId, "agent_lesson_reviewed", {
    lesson_id: id,
    decision: body.action,
    edited: body.action === "approve" && Boolean(editedText),
  });
  return NextResponse.json({ lesson: data });
}
