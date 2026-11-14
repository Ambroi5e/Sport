-- v0.11.2 : objectifs de course et zones cardiaques.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

create table public.race_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  race_on date not null,
  -- Course à pied : de 1 km à 250 km.
  distance_m integer not null check (distance_m between 1000 and 250000),
  -- Temps visé, facultatif : de 3 minutes à 60 heures.
  target_seconds integer check (target_seconds between 180 and 216000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index race_plans_user_date_idx on public.race_plans (user_id, race_on);

create trigger race_plans_updated_at before update on public.race_plans
  for each row execute function public.set_updated_at();

alter table public.race_plans enable row level security;

create policy "race_plans_select_own" on public.race_plans
  for select to authenticated using (user_id = (select auth.uid()));
create policy "race_plans_insert_own" on public.race_plans
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "race_plans_update_own" on public.race_plans
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "race_plans_delete_own" on public.race_plans
  for delete to authenticated using (user_id = (select auth.uid()));

-- Fréquence cardiaque maximale et de repos : les cinq zones se calculent à la lecture.
alter table public.profiles
  add column hr_max smallint check (hr_max between 100 and 240),
  add column hr_rest smallint check (hr_rest between 25 and 120),
  add constraint profiles_hr_rest_below_max check (hr_rest is null or hr_max is null or hr_rest < hr_max);
