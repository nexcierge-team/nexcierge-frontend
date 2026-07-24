-- Backfill sourcing_stage for sessions handed off BEFORE the stage
-- feature existed (migration 0020). Those rows have sourcing_stage NULL,
-- so the buyer's progress timeline renders fully upcoming even though
-- the brief is with (or claimed by) an account manager.
--
-- Derivation from existing signals:
--   status='in_handoff' + assigned_am_user_id set  → 'in_review'
--   status='in_handoff' + unassigned               → 'brief_submitted'
-- The brief_submitted history timestamp comes from handoff_requested_at
-- (always set by tryClaimHandoff). There is no claimed_at column, so
-- in_review gets no history entry — the timeline simply shows the stage
-- without a timestamp.
--
-- Deliberately NOT touched:
--   - status='ai' rows (pre-handoff: NULL is correct)
--   - status='closed' rows (their final stage is unknowable; guessing
--     'in_review' would put wrong next-step copy on a finished request)
--   - anything later than in_review: off-platform progress has no DB
--     signal — the assigned AM sets those manually via the stage picker
--     in the dashboard brief sidebar (works on old sessions too).
--
-- Idempotent via the sourcing_stage IS NULL guard.

update public.chat_sessions
set
  sourcing_stage = case
    when assigned_am_user_id is not null then 'in_review'
    else 'brief_submitted'
  end,
  sourcing_stage_history = case
    when handoff_requested_at is not null
      then jsonb_build_object('brief_submitted', to_jsonb(handoff_requested_at))
    else '{}'::jsonb
  end
where status = 'in_handoff'
  and sourcing_stage is null;
