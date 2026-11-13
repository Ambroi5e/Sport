-- v0.8.1 : planning intelligent.
-- Migration non destructive : aucune suppression, aucun retrait de droit.
-- Le planning se calcule à la lecture : seuls la semaine type, les changements
-- faits à la main (séance déplacée, jour sans séance) et les séances allégées
-- sont stockés.

-- Sports fixes de la semaine type -------------------------------------------------
-- Le padel du mercredi : le planning évite d'y coller une séance qui travaille les
-- mêmes muscles. Les jours disponibles restent dans profiles.training_days.

create table public.weekly_sports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 1 = lundi … 7 = dimanche, comme profiles.training_days.
  weekday smallint not null check (weekday between 1 and 7),
  sport public.activity_sport not null,
  label text check (char_length(label) between 1 and 40),
  duration_minutes smallint not null check (duration_minutes between 5 and 600),
  intensity public.activity_intensity not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((sport = 'autre') = (label is not null))
);

create index weekly_sports_user_weekday_idx on public.weekly_sports (user_id, weekday);

create trigger weekly_sports_updated_at before update on public.weekly_sports
  for each row execute function public.set_updated_at();

alter table public.weekly_sports enable row level security;

create policy "weekly_sports_select_own" on public.weekly_sports
  for select to authenticated using (user_id = (select auth.uid()));
create policy "weekly_sports_insert_own" on public.weekly_sports
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "weekly_sports_update_own" on public.weekly_sports
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "weekly_sports_delete_own" on public.weekly_sports
  for delete to authenticated using (user_id = (select auth.uid()));

-- Séances déplacées à la main -------------------------------------------------------
-- Une séance du programme posée sur un jour choisi, pour une semaine seulement.
-- La clé étrangère (template_id, user_id) garantit que la séance est à la personne.

create table public.session_pins (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  template_id uuid not null,
  planned_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start, template_id),
  foreign key (template_id, user_id) references public.workout_templates (id, user_id) on delete cascade,
  check (planned_on between week_start and week_start + 6)
);

create index session_pins_template_idx on public.session_pins (template_id, user_id);

create trigger session_pins_updated_at before update on public.session_pins
  for each row execute function public.set_updated_at();

alter table public.session_pins enable row level security;

create policy "session_pins_select_own" on public.session_pins
  for select to authenticated using (user_id = (select auth.uid()));
create policy "session_pins_insert_own" on public.session_pins
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "session_pins_update_own" on public.session_pins
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "session_pins_delete_own" on public.session_pins
  for delete to authenticated using (user_id = (select auth.uid()));

-- Jours sans séance ajoutés à la main -------------------------------------------------
-- « Pas dispo jeudi cette semaine », ou la séance du jour décalée : le planning ne
-- place rien ce jour-là.

create table public.blocked_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_on)
);

alter table public.blocked_days enable row level security;

create policy "blocked_days_select_own" on public.blocked_days
  for select to authenticated using (user_id = (select auth.uid()));
create policy "blocked_days_insert_own" on public.blocked_days
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "blocked_days_update_own" on public.blocked_days
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "blocked_days_delete_own" on public.blocked_days
  for delete to authenticated using (user_id = (select auth.uid()));

-- Séance allégée --------------------------------------------------------------------
-- Démarrée comme une décharge quand la forme est basse ; jamais la référence de la
-- charge suivante.

alter table public.workouts add column is_light boolean not null default false;
