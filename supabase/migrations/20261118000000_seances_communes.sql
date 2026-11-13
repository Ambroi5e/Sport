-- v0.9.1 : séances communes en temps réel.
-- Chacun garde sa séance ; le fil partagé est une copie réduite des séries
-- terminées, écrite par un déclencheur et lisible par les seuls participants.

-- Séances communes ------------------------------------------------------------------

create table public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Séance commune' check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index group_sessions_user_id_idx on public.group_sessions (user_id);

-- Invité (joined_at vide) puis présent. La ligne de celui qui lance est créée avec la séance.
create table public.group_participants (
  session_id uuid not null references public.group_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index group_participants_user_id_idx on public.group_participants (user_id);

-- Une série terminée pendant une séance commune. Écrite seulement par le déclencheur.
create table public.group_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.group_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  set_id uuid not null references public.workout_sets (id) on delete cascade,
  exercise_name text not null,
  weight_kg numeric(6, 2),
  reps smallint,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  unique (session_id, set_id)
);
create index group_events_session_created_idx on public.group_events (session_id, created_at desc);
create index group_events_user_id_idx on public.group_events (user_id);
create index group_events_set_id_idx on public.group_events (set_id);

-- Appartenance, sans récursion entre politiques ------------------------------------------

create function public.owns_group_session(p_session uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_sessions s where s.id = p_session and s.user_id = (select auth.uid()))
$$;

-- Invité ou présent.
create function public.is_group_participant(p_session uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_participants p where p.session_id = p_session and p.user_id = (select auth.uid()))
$$;

-- Présent : a rejoint.
create function public.is_group_member(p_session uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_participants p
     where p.session_id = p_session and p.user_id = (select auth.uid()) and p.joined_at is not null
  )
$$;

-- Politiques ------------------------------------------------------------------------

alter table public.group_sessions enable row level security;

create policy "group_sessions_select_participant" on public.group_sessions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_group_participant(id)));
create policy "group_sessions_insert_own" on public.group_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "group_sessions_update_own" on public.group_sessions
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "group_sessions_delete_own" on public.group_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

alter table public.group_participants enable row level security;

-- Les participants se voient entre eux ; un invité voit qui est là avant de rejoindre.
create policy "group_participants_select_participant" on public.group_participants
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_group_participant(session_id)));
-- Seul celui qui a lancé la séance invite, et seulement lui-même ou ses amis.
create policy "group_participants_insert_owner" on public.group_participants
  for insert to authenticated
  with check ((select public.owns_group_session(session_id)) and (user_id = (select auth.uid()) or (select public.is_friend(user_id))));
-- Rejoindre : chacun ne modifie que sa propre ligne.
create policy "group_participants_update_own" on public.group_participants
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Quitter (soi-même) ou retirer quelqu'un (celui qui a lancé).
create policy "group_participants_delete_own_or_owner" on public.group_participants
  for delete to authenticated using (user_id = (select auth.uid()) or (select public.owns_group_session(session_id)));

alter table public.group_events enable row level security;

-- Le fil n'est lisible qu'après avoir rejoint. Aucune écriture depuis l'app.
create policy "group_events_select_member" on public.group_events
  for select to authenticated using ((select public.is_group_member(session_id)));

-- Le fil s'écrit tout seul ---------------------------------------------------------------

-- Une série qui passe à « faite » part dans les séances communes en cours que la
-- personne a rejointes (six heures au plus après leur lancement). Jamais
-- l'échauffement. Une erreur ici ne doit jamais empêcher d'enregistrer la série.
create function public.share_set_with_group() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.completed_at is null or new.is_warmup or (tg_op = 'UPDATE' and old.completed_at is not null) then
    return new;
  end if;
  begin
    insert into public.group_events (session_id, user_id, set_id, exercise_name, weight_kg, reps, duration_seconds)
    select p.session_id, new.user_id, new.id, e.name, new.weight_kg, new.reps, new.duration_seconds
      from public.group_participants p
      join public.group_sessions s on s.id = p.session_id
      join public.exercises e on e.id = new.exercise_id
     where p.user_id = new.user_id
       and p.joined_at is not null
       and s.ended_at is null
       and s.created_at > now() - interval '6 hours'
    on conflict (session_id, set_id) do nothing;
  exception when others then
    null;
  end;
  return new;
end;
$$;

create trigger workout_sets_share_with_group
  after insert or update of completed_at on public.workout_sets
  for each row execute function public.share_set_with_group();

-- Prénoms des participants : ils ne sont pas forcément amis entre eux.
create function public.group_people(p_session uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz, is_owner boolean)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_group_participant(p_session) then
    raise exception 'not_participant' using errcode = '42501';
  end if;
  return query
    select p.user_id, pr.display_name, p.joined_at, p.user_id = s.user_id
      from public.group_participants p
      join public.group_sessions s on s.id = p.session_id
      left join public.profiles pr on pr.user_id = p.user_id
     where p.session_id = p_session
     order by (p.user_id = s.user_id) desc, p.created_at, p.user_id;
end;
$$;

-- Temps réel : seulement ces deux tables, filtrées par leurs politiques de lecture.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.group_events, public.group_participants;
  end if;
end
$$;
