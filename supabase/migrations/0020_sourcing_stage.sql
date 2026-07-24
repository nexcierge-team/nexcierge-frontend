-- Adds the buyer-visible sourcing progress stage to chat_sessions.
--
-- sourcing_stage: current stage of the sourcing pipeline shown on the
-- buyer's progress rail. NULL until handoff (the interview phase has no
-- stage). The first two stages are set programmatically:
--   'brief_submitted' — tryClaimHandoff() when the buyer requests review
--   'in_review'       — the claim route when an AM claims the brief
-- Later stages are advanced manually by the assigned AM via
-- POST /api/am/sessions/[id]/stage.
--
-- sourcing_stage_history: stage slug → ISO timestamp of when the session
-- entered that stage. The buyer timeline shows a timestamp on every done
-- stage, and the AM can set stages non-linearly (skip ahead, correct
-- backwards), so a single "updated_at" can't reconstruct the display.
-- brief_submitted's display falls back to handoff_requested_at.
--
-- Lives on chat_sessions (not rfqs) because chat_sessions is already in
-- the supabase_realtime publication with replica identity full (0009), so
-- stage changes reach the buyer's open tab with no new plumbing.
--
-- RLS: no policy changes needed. Buyers SELECT all columns of their own
-- rows (0004); AMs can UPDATE only sessions assigned to them
-- (0008_tighten_update_policies).
--
-- Slugs must stay in sync with SOURCING_STAGES in lib/sourcingStages.ts.

alter table public.chat_sessions
  add column if not exists sourcing_stage text
    check (sourcing_stage in (
      'brief_submitted',
      'in_review',
      'suppliers_contacted',
      'quotes_received',
      'proposal_negotiation',
      'order_production',
      'inspection_logistics',
      'delivered'
    )),
  add column if not exists sourcing_stage_history jsonb not null default '{}';
