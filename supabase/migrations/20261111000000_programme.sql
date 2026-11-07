-- v0.6 : plan prédictif. Programme généré, préférences d'exercices.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

create type public.exercise_preference as enum ('aime', 'evite');

-- Programmes ----------------------------------------------------------------------
-- Les réglages du programme et son objectif chiffré. Les séances sont des modèles
-- (workout_templates.program_id) ; les charges prévues se calculent à la lecture.

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  starts_on date not null,
  weeks smallint not null default 12 check (weeks between 4 and 24),
  deload_every smallint not null default 5 check (deload_every between 4 and 6),
  sessions_per_week smallint not null check (sessions_per_week between 2 and 6),
  session_minutes smallint not null check (session_minutes between 30 and 120),
  equipment public.equipment[] not null check (cardinality(equipment) > 0),
  priority_muscles public.muscle[] not null default '{}',
  goal_exercise_id uuid references public.exercises (id) on delete restrict,
  goal_kg numeric(5, 1) check (goal_kg between 1 and 500),
  goal_date date,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check ((goal_exercise_id is null) = (goal_kg is null))
);

-- Un seul programme en cours par personne.
create unique index programs_one_active_idx on public.programs (user_id) where ended_on is null;
create index programs_user_id_idx on public.programs (user_id);
create index programs_goal_exercise_id_idx on public.programs (goal_exercise_id);

create trigger programs_updated_at before update on public.programs
  for each row execute function public.set_updated_at();

alter table public.programs enable row level security;

create policy "programs_select_own" on public.programs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "programs_insert_own" on public.programs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (goal_exercise_id is null or public.exercise_is_usable(goal_exercise_id)));
create policy "programs_update_own" on public.programs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (goal_exercise_id is null or public.exercise_is_usable(goal_exercise_id)));
create policy "programs_delete_own" on public.programs
  for delete to authenticated using (user_id = (select auth.uid()));

-- Séances du programme : des modèles rattachés au programme du même utilisateur.
alter table public.workout_templates add column program_id uuid;
alter table public.workout_templates
  add constraint workout_templates_program_fkey foreign key (program_id, user_id)
  references public.programs (id, user_id) on delete cascade;
create index workout_templates_program_idx on public.workout_templates (program_id, user_id);

-- Préférences d'exercices -----------------------------------------------------------

create table public.exercise_preferences (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  preference public.exercise_preference not null,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create index exercise_preferences_exercise_id_idx on public.exercise_preferences (exercise_id);

alter table public.exercise_preferences enable row level security;

create policy "exercise_preferences_select_own" on public.exercise_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "exercise_preferences_insert_own" on public.exercise_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.exercise_is_usable(exercise_id));
create policy "exercise_preferences_update_own" on public.exercise_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.exercise_is_usable(exercise_id));
create policy "exercise_preferences_delete_own" on public.exercise_preferences
  for delete to authenticated using (user_id = (select auth.uid()));
