-- v0.2 : musculation. Exercices, modèles, séances, séries, catalogue commun.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

-- Types ----------------------------------------------------------------------

create type public.muscle as enum (
  'pectoraux', 'dorsaux', 'trapezes', 'lombaires',
  'epaules_avant', 'epaules_laterales', 'epaules_arriere',
  'biceps', 'triceps', 'avant_bras',
  'abdominaux', 'obliques',
  'quadriceps', 'ischios', 'fessiers', 'adducteurs', 'mollets'
);

create type public.equipment as enum (
  'barre', 'halteres', 'machine', 'poulie', 'poids_du_corps', 'kettlebell', 'elastique', 'autre'
);

-- charge : charge et répétitions ; poids_du_corps : répétitions, lest facultatif ;
-- duree : secondes, lest facultatif.
create type public.exercise_measure as enum ('charge', 'poids_du_corps', 'duree');

-- Exercices --------------------------------------------------------------------
-- user_id vide = catalogue commun : lisible par les connectés, modifiable par
-- personne depuis l'app (les politiques d'écriture exigent user_id = auth.uid()).

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  slug text check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 60),
  equipment public.equipment not null default 'autre',
  measure public.exercise_measure not null default 'charge',
  primary_muscles public.muscle[] not null check (cardinality(primary_muscles) between 1 and 3),
  secondary_muscles public.muscle[] not null default '{}' check (cardinality(secondary_muscles) <= 5),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index exercises_catalogue_slug_idx on public.exercises (slug) where user_id is null;
create index exercises_user_id_idx on public.exercises (user_id);

create trigger exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;

create policy "exercises_select_catalogue_or_own" on public.exercises
  for select to authenticated using (user_id is null or user_id = (select auth.uid()));
create policy "exercises_insert_own" on public.exercises
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "exercises_update_own" on public.exercises
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises_delete_own" on public.exercises
  for delete to authenticated using (user_id = (select auth.uid()));

-- Vrai si l'exercice est utilisable par l'utilisateur courant (catalogue ou personnel).
-- SECURITY INVOKER : la RLS de exercises s'applique, rien n'est contourné.
create function public.exercise_is_usable(p_exercise_id uuid) returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.exercises e
    where e.id = p_exercise_id and (e.user_id is null or e.user_id = (select auth.uid()))
  )
$$;

-- Modèles de séance --------------------------------------------------------------

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index workout_templates_user_id_idx on public.workout_templates (user_id);

create trigger workout_templates_updated_at before update on public.workout_templates
  for each row execute function public.set_updated_at();

alter table public.workout_templates enable row level security;

create policy "workout_templates_select_own" on public.workout_templates
  for select to authenticated using (user_id = (select auth.uid()));
create policy "workout_templates_insert_own" on public.workout_templates
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "workout_templates_update_own" on public.workout_templates
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "workout_templates_delete_own" on public.workout_templates
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.template_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid not null,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null default 0,
  sets smallint not null default 3 check (sets between 1 and 20),
  rep_min smallint check (rep_min between 1 and 100),
  rep_max smallint check (rep_max between 1 and 100),
  rest_seconds smallint check (rest_seconds between 0 and 900),
  created_at timestamptz not null default now(),
  check (rep_min is null or rep_max is null or rep_min <= rep_max),
  -- Clé composite : un élément ne peut appartenir qu'à un modèle du même utilisateur.
  foreign key (template_id, user_id) references public.workout_templates (id, user_id) on delete cascade
);

create index template_items_template_idx on public.template_items (template_id, user_id);
create index template_items_user_id_idx on public.template_items (user_id);
create index template_items_exercise_id_idx on public.template_items (exercise_id);

alter table public.template_items enable row level security;

create policy "template_items_select_own" on public.template_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "template_items_insert_own" on public.template_items
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.exercise_is_usable(exercise_id));
create policy "template_items_update_own" on public.template_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.exercise_is_usable(exercise_id));
create policy "template_items_delete_own" on public.template_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Séances ----------------------------------------------------------------------

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid references public.workout_templates (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  performed_on date not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at),
  unique (id, user_id)
);

create index workouts_user_performed_idx on public.workouts (user_id, performed_on desc);
create index workouts_template_id_idx on public.workouts (template_id);

create trigger workouts_updated_at before update on public.workouts
  for each row execute function public.set_updated_at();

alter table public.workouts enable row level security;

create policy "workouts_select_own" on public.workouts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "workouts_insert_own" on public.workouts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "workouts_update_own" on public.workouts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "workouts_delete_own" on public.workouts
  for delete to authenticated using (user_id = (select auth.uid()));

-- Séries. completed_at vide = série prévue, pas encore faite.
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id uuid not null,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  exercise_order smallint not null default 0 check (exercise_order between 0 and 99),
  set_number smallint not null check (set_number between 1 and 50),
  weight_kg numeric(6, 2) check (weight_kg between 0 and 1000),
  reps smallint check (reps between 0 and 1000),
  duration_seconds integer check (duration_seconds between 0 and 86400),
  rep_min smallint check (rep_min between 1 and 100),
  rep_max smallint check (rep_max between 1 and 100),
  is_warmup boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workout_id, user_id) references public.workouts (id, user_id) on delete cascade
);

create index workout_sets_workout_idx on public.workout_sets (workout_id, user_id);
create index workout_sets_exercise_history_idx on public.workout_sets (user_id, exercise_id, completed_at desc);
create index workout_sets_exercise_id_idx on public.workout_sets (exercise_id);

create trigger workout_sets_updated_at before update on public.workout_sets
  for each row execute function public.set_updated_at();

alter table public.workout_sets enable row level security;

create policy "workout_sets_select_own" on public.workout_sets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "workout_sets_insert_own" on public.workout_sets
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.exercise_is_usable(exercise_id));
create policy "workout_sets_update_own" on public.workout_sets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.exercise_is_usable(exercise_id));
create policy "workout_sets_delete_own" on public.workout_sets
  for delete to authenticated using (user_id = (select auth.uid()));

-- Catalogue commun ---------------------------------------------------------------

insert into public.exercises (user_id, slug, name, equipment, measure, primary_muscles, secondary_muscles) values
  -- Pectoraux
  (null, 'developpe-couche-barre', 'Développé couché', 'barre', 'charge', '{pectoraux}', '{triceps,epaules_avant}'),
  (null, 'developpe-couche-halteres', 'Développé couché haltères', 'halteres', 'charge', '{pectoraux}', '{triceps,epaules_avant}'),
  (null, 'developpe-incline-barre', 'Développé incliné', 'barre', 'charge', '{pectoraux}', '{epaules_avant,triceps}'),
  (null, 'developpe-incline-halteres', 'Développé incliné haltères', 'halteres', 'charge', '{pectoraux}', '{epaules_avant,triceps}'),
  (null, 'developpe-decline', 'Développé décliné', 'barre', 'charge', '{pectoraux}', '{triceps}'),
  (null, 'ecarte-halteres', 'Écarté couché haltères', 'halteres', 'charge', '{pectoraux}', '{epaules_avant}'),
  (null, 'ecarte-poulie', 'Écarté à la poulie', 'poulie', 'charge', '{pectoraux}', '{epaules_avant}'),
  (null, 'pec-deck', 'Pec deck', 'machine', 'charge', '{pectoraux}', '{}'),
  (null, 'presse-pectoraux', 'Presse à pectoraux', 'machine', 'charge', '{pectoraux}', '{triceps,epaules_avant}'),
  (null, 'dips', 'Dips', 'poids_du_corps', 'poids_du_corps', '{pectoraux,triceps}', '{epaules_avant}'),
  (null, 'pompes', 'Pompes', 'poids_du_corps', 'poids_du_corps', '{pectoraux}', '{triceps,epaules_avant}'),
  -- Dos
  (null, 'tractions-pronation', 'Tractions pronation', 'poids_du_corps', 'poids_du_corps', '{dorsaux}', '{biceps,epaules_arriere}'),
  (null, 'tractions-supination', 'Tractions supination', 'poids_du_corps', 'poids_du_corps', '{dorsaux,biceps}', '{}'),
  (null, 'tirage-vertical', 'Tirage vertical', 'poulie', 'charge', '{dorsaux}', '{biceps,epaules_arriere}'),
  (null, 'tirage-vertical-serre', 'Tirage vertical prise serrée', 'poulie', 'charge', '{dorsaux}', '{biceps}'),
  (null, 'rowing-barre', 'Rowing barre', 'barre', 'charge', '{dorsaux}', '{trapezes,epaules_arriere,biceps,lombaires}'),
  (null, 'rowing-haltere', 'Rowing haltère un bras', 'halteres', 'charge', '{dorsaux}', '{epaules_arriere,biceps}'),
  (null, 'tirage-horizontal', 'Tirage horizontal', 'poulie', 'charge', '{dorsaux}', '{trapezes,biceps,epaules_arriere}'),
  (null, 'rowing-machine', 'Rowing à la machine', 'machine', 'charge', '{dorsaux}', '{trapezes,biceps}'),
  (null, 'pullover-poulie', 'Pull-over à la poulie', 'poulie', 'charge', '{dorsaux}', '{}'),
  (null, 'souleve-de-terre', 'Soulevé de terre', 'barre', 'charge', '{ischios,fessiers,lombaires}', '{dorsaux,trapezes,quadriceps,avant_bras}'),
  (null, 'shrugs-halteres', 'Shrugs haltères', 'halteres', 'charge', '{trapezes}', '{avant_bras}'),
  (null, 'extensions-lombaires', 'Extensions lombaires', 'poids_du_corps', 'poids_du_corps', '{lombaires}', '{fessiers,ischios}'),
  -- Épaules
  (null, 'developpe-militaire', 'Développé militaire', 'barre', 'charge', '{epaules_avant}', '{epaules_laterales,triceps}'),
  (null, 'developpe-halteres-assis', 'Développé haltères assis', 'halteres', 'charge', '{epaules_avant}', '{epaules_laterales,triceps}'),
  (null, 'elevations-laterales', 'Élévations latérales', 'halteres', 'charge', '{epaules_laterales}', '{}'),
  (null, 'elevations-laterales-poulie', 'Élévations latérales à la poulie', 'poulie', 'charge', '{epaules_laterales}', '{}'),
  (null, 'elevations-laterales-machine', 'Élévations latérales à la machine', 'machine', 'charge', '{epaules_laterales}', '{}'),
  (null, 'oiseau-halteres', 'Oiseau haltères', 'halteres', 'charge', '{epaules_arriere}', '{trapezes}'),
  (null, 'face-pull', 'Face pull', 'poulie', 'charge', '{epaules_arriere}', '{trapezes}'),
  (null, 'pec-deck-inverse', 'Pec deck inversé', 'machine', 'charge', '{epaules_arriere}', '{trapezes}'),
  (null, 'elevations-frontales', 'Élévations frontales', 'halteres', 'charge', '{epaules_avant}', '{}'),
  (null, 'rowing-menton', 'Rowing menton', 'barre', 'charge', '{epaules_laterales,trapezes}', '{biceps}'),
  -- Biceps
  (null, 'curl-barre', 'Curl barre', 'barre', 'charge', '{biceps}', '{avant_bras}'),
  (null, 'curl-halteres', 'Curl haltères', 'halteres', 'charge', '{biceps}', '{avant_bras}'),
  (null, 'curl-marteau', 'Curl marteau', 'halteres', 'charge', '{biceps,avant_bras}', '{}'),
  (null, 'curl-incline', 'Curl incliné haltères', 'halteres', 'charge', '{biceps}', '{}'),
  (null, 'curl-pupitre', 'Curl pupitre', 'barre', 'charge', '{biceps}', '{}'),
  (null, 'curl-poulie', 'Curl à la poulie', 'poulie', 'charge', '{biceps}', '{}'),
  -- Triceps
  (null, 'extension-triceps-poulie', 'Extension triceps à la poulie', 'poulie', 'charge', '{triceps}', '{}'),
  (null, 'extension-triceps-corde', 'Extension triceps à la corde', 'poulie', 'charge', '{triceps}', '{}'),
  (null, 'barre-front', 'Barre au front', 'barre', 'charge', '{triceps}', '{}'),
  (null, 'extension-nuque-haltere', 'Extension nuque haltère', 'halteres', 'charge', '{triceps}', '{}'),
  (null, 'developpe-couche-serre', 'Développé couché prise serrée', 'barre', 'charge', '{triceps,pectoraux}', '{epaules_avant}'),
  (null, 'dips-banc', 'Dips entre deux bancs', 'poids_du_corps', 'poids_du_corps', '{triceps}', '{epaules_avant}'),
  -- Jambes
  (null, 'squat', 'Squat', 'barre', 'charge', '{quadriceps,fessiers}', '{adducteurs,lombaires}'),
  (null, 'squat-avant', 'Squat avant', 'barre', 'charge', '{quadriceps}', '{fessiers,abdominaux}'),
  (null, 'goblet-squat', 'Goblet squat', 'halteres', 'charge', '{quadriceps,fessiers}', '{abdominaux}'),
  (null, 'presse-cuisses', 'Presse à cuisses', 'machine', 'charge', '{quadriceps,fessiers}', '{adducteurs}'),
  (null, 'hack-squat', 'Hack squat', 'machine', 'charge', '{quadriceps}', '{fessiers}'),
  (null, 'fentes-halteres', 'Fentes haltères', 'halteres', 'charge', '{quadriceps,fessiers}', '{adducteurs,ischios}'),
  (null, 'squat-bulgare', 'Squat bulgare', 'halteres', 'charge', '{quadriceps,fessiers}', '{adducteurs}'),
  (null, 'leg-extension', 'Leg extension', 'machine', 'charge', '{quadriceps}', '{}'),
  (null, 'leg-curl-allonge', 'Leg curl allongé', 'machine', 'charge', '{ischios}', '{mollets}'),
  (null, 'leg-curl-assis', 'Leg curl assis', 'machine', 'charge', '{ischios}', '{}'),
  (null, 'souleve-de-terre-roumain', 'Soulevé de terre roumain', 'barre', 'charge', '{ischios,fessiers}', '{lombaires,avant_bras}'),
  (null, 'hip-thrust', 'Hip thrust', 'barre', 'charge', '{fessiers}', '{ischios}'),
  (null, 'adducteurs-machine', 'Adducteurs à la machine', 'machine', 'charge', '{adducteurs}', '{}'),
  (null, 'abducteurs-machine', 'Abducteurs à la machine', 'machine', 'charge', '{fessiers}', '{}'),
  (null, 'mollets-debout', 'Mollets debout', 'machine', 'charge', '{mollets}', '{}'),
  (null, 'mollets-assis', 'Mollets assis', 'machine', 'charge', '{mollets}', '{}'),
  (null, 'kettlebell-swing', 'Kettlebell swing', 'kettlebell', 'charge', '{fessiers,ischios}', '{lombaires}'),
  -- Abdominaux
  (null, 'crunch', 'Crunch', 'poids_du_corps', 'poids_du_corps', '{abdominaux}', '{}'),
  (null, 'crunch-poulie', 'Crunch à la poulie', 'poulie', 'charge', '{abdominaux}', '{}'),
  (null, 'releve-jambes-suspendu', 'Relevé de jambes suspendu', 'poids_du_corps', 'poids_du_corps', '{abdominaux}', '{}'),
  (null, 'gainage', 'Gainage', 'poids_du_corps', 'duree', '{abdominaux}', '{obliques}'),
  (null, 'gainage-lateral', 'Gainage latéral', 'poids_du_corps', 'duree', '{obliques}', '{abdominaux}'),
  (null, 'roue-abdominale', 'Roue abdominale', 'autre', 'poids_du_corps', '{abdominaux}', '{dorsaux}'),
  (null, 'russian-twist', 'Russian twist', 'poids_du_corps', 'poids_du_corps', '{obliques}', '{abdominaux}'),
  -- Avant-bras
  (null, 'curl-poignets', 'Curl poignets', 'barre', 'charge', '{avant_bras}', '{}'),
  (null, 'marche-du-fermier', 'Marche du fermier', 'halteres', 'duree', '{avant_bras,trapezes}', '{abdominaux}')
on conflict do nothing;
