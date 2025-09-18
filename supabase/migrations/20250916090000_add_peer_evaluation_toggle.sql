alter table public.activities
  add column if not exists enable_peer_evaluation boolean default true;

update public.activities
  set enable_peer_evaluation = true
  where enable_peer_evaluation is null;

alter table public.activities
  alter column enable_peer_evaluation set not null;
