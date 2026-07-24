// Single source of truth for the sourcing pipeline stages shown on the
// buyer's progress rail and the AM's stage picker.
//
// Slugs must stay in sync with the CHECK constraint in
// supabase/migrations/0020_sourcing_stage.sql and the allowlist in
// app/api/am/sessions/[id]/stage/route.ts.
//
// Order matters: the buyer timeline renders these top-to-bottom and
// derives done/current/upcoming from array position.

export const SOURCING_STAGES = [
  "brief_submitted",
  "in_review",
  "suppliers_contacted",
  "quotes_received",
  "proposal_negotiation",
  "order_production",
  "inspection_logistics",
  "delivered",
] as const;

export type SourcingStage = (typeof SOURCING_STAGES)[number];

// Stage slug → ISO timestamp of when the session entered that stage.
export type SourcingStageHistory = Partial<Record<SourcingStage, string>>;

// -1 for null (pre-handoff: every stage renders as upcoming).
export function stageIndex(stage: SourcingStage | null): number {
  if (!stage) return -1;
  return SOURCING_STAGES.indexOf(stage);
}
