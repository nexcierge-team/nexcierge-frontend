-- Adds rfqs.electrical_requirements — the power supply at the buyer's
-- facility (voltage / frequency / phase, e.g. "480V 3-phase 60Hz").
-- Destination-grid spec captured during the interview's business-requirements
-- phase; Chinese machines ship wired 220/380V 50Hz by default, so the AM
-- needs this to source a machine built for the buyer's grid.
--
-- OPTIONAL field: deliberately NOT part of the rfqs.is_complete generated
-- column (the canonical handoff gate) — a "not sure" buyer can still hand
-- off, and the AM follows up.

alter table public.rfqs
  add column if not exists electrical_requirements text not null default '';
