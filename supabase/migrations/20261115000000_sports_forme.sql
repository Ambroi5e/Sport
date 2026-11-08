-- v0.8 : sports additionnels et forme du jour.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

create type public.activity_sport as enum (
  'padel', 'tennis', 'squash', 'badminton', 'foot', 'basket', 'handball', 'rugby', 'volley',
  'escalade', 'combat', 'autre'
);
create type public.activity_intensity as enum ('legere', 'moderee', 'intense');

-- Activités ---------------------------------------------------------------------
-- Un match, une partie, une séance d'un autre sport que la musculation. La dépense
-- se calcule à la lecture (MET × poids × durée) : rien d'estimé n'est stocké.
-- L'endurance (v0.11) ajoutera ses colonnes et ses sports à cette même table.

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  performed_on date not null,
  sport public.activity_sport not null,
  -- Nom libre, seulement pour « autre » : un padel s'appelle padel.
  label text check (char_length(label) between 1 and 40),
  duration_minutes smallint not null check (duration_minutes between 5 and 600),
  intensity public.activity_intensity not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((sport = 'autre') = (label is not null))
);

create index activities_user_performed_idx on public.activities (user_id, performed_on desc);

create trigger activities_updated_at before update on public.activities
  for each row execute function public.set_updated_at();

alter table public.activities enable row level security;

create policy "activities_select_own" on public.activities
  for select to authenticated using (user_id = (select auth.uid()));
create policy "activities_insert_own" on public.activities
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "activities_update_own" on public.activities
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "activities_delete_own" on public.activities
  for delete to authenticated using (user_id = (select auth.uid()));

-- Forme du jour -----------------------------------------------------------------
-- Quatre notes de 1 à 5 dans leur sens naturel : sommeil et énergie (5 = très bien),
-- courbatures et stress (5 = forts). Une ligne par jour, refaire le check-in la corrige.

create table public.daily_checkins (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  checkin_on date not null,
  sleep smallint not null check (sleep between 1 and 5),
  soreness smallint not null check (soreness between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  stress smallint not null check (stress between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, checkin_on)
);

create trigger daily_checkins_updated_at before update on public.daily_checkins
  for each row execute function public.set_updated_at();

alter table public.daily_checkins enable row level security;

create policy "daily_checkins_select_own" on public.daily_checkins
  for select to authenticated using (user_id = (select auth.uid()));
create policy "daily_checkins_insert_own" on public.daily_checkins
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "daily_checkins_update_own" on public.daily_checkins
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "daily_checkins_delete_own" on public.daily_checkins
  for delete to authenticated using (user_id = (select auth.uid()));
