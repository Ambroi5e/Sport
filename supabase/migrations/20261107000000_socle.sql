-- v0.1 : socle. Profils, rôles, invitations, modules, objectifs, pesées.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

-- Types ----------------------------------------------------------------------

create type public.sex as enum ('homme', 'femme', 'autre');

create type public.training_level as enum ('debutant', 'intermediaire', 'avance');

create type public.goal_type as enum (
  'prise_de_masse', 'seche', 'recomposition', 'force', 'hyrox',
  'course_10k', 'semi_marathon', 'marathon',
  'triathlon_s', 'triathlon_m', 'triathlon_70_3', 'triathlon_ironman',
  'raquette', 'collectif', 'forme'
);

create type public.app_module as enum (
  'musculation', 'endurance', 'hyrox', 'sports', 'nutrition',
  'courses', 'corps', 'complements', 'planning', 'amis'
);

create type public.app_role as enum ('admin');

-- Utilitaires ------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normalise un code saisi (« fonte-ab12-cd34 » ou « FONTEAB12CD34 ») puis le hache.
create function public.invitation_hash(p_code text) returns text
language sql immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'sha256'),
    'hex'
  )
$$;

-- Profils ----------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 40),
  birth_year smallint check (birth_year between 1900 and 2100),
  sex public.sex,
  height_cm numeric(4, 1) check (height_cm between 100 and 250),
  level public.training_level,
  sessions_per_week smallint check (sessions_per_week between 0 and 14),
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  distance_unit text not null default 'km' check (distance_unit in ('km', 'mi')),
  timezone text not null default 'Europe/Paris' check (char_length(timezone) <= 64),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (user_id = (select auth.uid()));

-- Rôles ------------------------------------------------------------------------
-- Exception assumée aux quatre politiques : un utilisateur lit son rôle mais ne
-- peut ni s'en donner ni en retirer. Les rôles sont attribués en SQL par Claude.

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "user_roles_select_own" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()));

create function public.is_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  )
$$;

-- Invitations ------------------------------------------------------------------

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);

create index invitations_created_by_idx on public.invitations (created_by);
create index invitations_used_by_idx on public.invitations (used_by);

alter table public.invitations enable row level security;

-- Seul un admin voit les invitations (jamais les codes en clair, seulement leur hachage).
create policy "invitations_select_admin" on public.invitations
  for select to authenticated using ((select public.is_admin()));

-- Crée un code et le renvoie en clair une seule fois. Réservé aux admins.
create function public.create_invitation(p_valid_days integer default 30)
returns table (code text, expires_at timestamptz)
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_raw text := '';
  v_expires timestamptz;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_valid_days is null or p_valid_days not between 1 and 90 then
    raise exception 'invalid_validity' using errcode = '22023';
  end if;
  for i in 0..7 loop
    v_raw := v_raw || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
  end loop;
  v_expires := now() + make_interval(days => p_valid_days);
  insert into public.invitations (code_hash, created_by, expires_at)
    values (public.invitation_hash('FONTE' || v_raw), (select auth.uid()), v_expires);
  code := 'FONTE-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
  expires_at := v_expires;
  return next;
end;
$$;

-- Compteurs pour la page admin : aucun contenu, seulement des nombres.
create function public.admin_stats()
returns table (users bigint, invitations_used bigint, invitations_active bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return query select
    (select count(*) from public.profiles),
    (select count(*) from public.invitations where used_by is not null),
    (select count(*) from public.invitations where used_by is null and expires_at > now());
end;
$$;

-- Inscription : un compte n'est créé qu'avec un code valide et inutilisé.
-- Le déclencheur bloque aussi les appels directs à l'API d'Auth.
create function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_invitation uuid;
begin
  update public.invitations
     set used_by = new.id, used_at = now()
   where code_hash = public.invitation_hash(new.raw_user_meta_data ->> 'invite_code')
     and used_by is null
     and expires_at > now()
  returning id into v_invitation;

  if v_invitation is null then
    raise exception 'invitation_invalid' using errcode = '42501';
  end if;

  insert into public.profiles (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Modules activés --------------------------------------------------------------

create table public.user_modules (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module public.app_module not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, module)
);

create trigger user_modules_updated_at before update on public.user_modules
  for each row execute function public.set_updated_at();

alter table public.user_modules enable row level security;

create policy "user_modules_select_own" on public.user_modules
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_modules_insert_own" on public.user_modules
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_modules_update_own" on public.user_modules
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_modules_delete_own" on public.user_modules
  for delete to authenticated using (user_id = (select auth.uid()));

-- Objectifs --------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.goal_type not null,
  is_primary boolean not null default false,
  target_date date,
  details jsonb not null default '{}'::jsonb check (pg_column_size(details) <= 4096),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals (user_id);
create unique index goals_one_primary_per_user on public.goals (user_id) where is_primary;

create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "goals_insert_own" on public.goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "goals_update_own" on public.goals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goals_delete_own" on public.goals
  for delete to authenticated using (user_id = (select auth.uid()));

-- Pesées -----------------------------------------------------------------------
-- Une pesée par jour (la pesée du matin) : une nouvelle saisie le même jour la remplace.
-- L'identifiant peut être généré sur le téléphone pour une synchronisation idempotente.

create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5, 2) not null check (weight_kg between 20 and 400),
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create trigger body_weights_updated_at before update on public.body_weights
  for each row execute function public.set_updated_at();

alter table public.body_weights enable row level security;

create policy "body_weights_select_own" on public.body_weights
  for select to authenticated using (user_id = (select auth.uid()));
create policy "body_weights_insert_own" on public.body_weights
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "body_weights_update_own" on public.body_weights
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "body_weights_delete_own" on public.body_weights
  for delete to authenticated using (user_id = (select auth.uid()));
