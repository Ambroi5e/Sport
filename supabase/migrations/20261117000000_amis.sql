-- v0.9 : amis et partage par catégorie.
-- Les politiques des tables de données ne changent pas : un ami lit par des
-- fonctions dédiées qui vérifient can_view(propriétaire, catégorie).

create type public.share_category as enum ('seances', 'records', 'poids', 'mensurations', 'nutrition', 'forme');

-- Amitiés ------------------------------------------------------------------------

-- Une ligne par paire, le plus petit identifiant en premier. Créée seulement par
-- accept_friend_invite : pas de politique d'insertion ni de modification.
create table public.friendships (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index friendships_user_b_idx on public.friendships (user_b);

alter table public.friendships enable row level security;

create policy "friendships_select_own" on public.friendships
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));
create policy "friendships_delete_own" on public.friendships
  for delete to authenticated using ((select auth.uid()) in (user_a, user_b));

create function public.is_friend(p_other uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
     where f.user_a = least((select auth.uid()), p_other)
       and f.user_b = greatest((select auth.uid()), p_other)
  )
$$;

-- Codes d'ami ----------------------------------------------------------------------

-- Code haché, usage unique. Créé seulement par create_friend_invite.
create table public.friend_invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
create index friend_invites_user_id_idx on public.friend_invites (user_id);
create index friend_invites_used_by_idx on public.friend_invites (used_by);

alter table public.friend_invites enable row level security;

create policy "friend_invites_select_own" on public.friend_invites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "friend_invites_delete_own" on public.friend_invites
  for delete to authenticated using (user_id = (select auth.uid()));

-- Crée un code d'ami et le renvoie en clair une seule fois.
create function public.create_friend_invite()
returns table (code text, expires_at timestamptz)
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_raw text := '';
  v_expires timestamptz := now() + interval '7 days';
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if (select count(*) from public.friend_invites i where i.user_id = v_user and i.used_at is null and i.expires_at > now()) >= 5 then
    raise exception 'too_many_invites' using errcode = '23514';
  end if;
  for i in 0..7 loop
    v_raw := v_raw || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
  end loop;
  insert into public.friend_invites (user_id, code_hash, expires_at)
    values (v_user, public.invitation_hash('AMI' || v_raw), v_expires);
  code := 'AMI-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
  expires_at := v_expires;
  return next;
end;
$$;

-- Saisir le code d'un autre : l'amitié est créée, le code est consommé.
create function public.accept_friend_invite(p_code text) returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select i.user_id into v_owner
    from public.friend_invites i
   where i.code_hash = public.invitation_hash(p_code)
     and i.used_at is null
     and i.expires_at > now()
     for update;
  if v_owner is null then
    raise exception 'invalid_code' using errcode = '22023';
  end if;
  if v_owner = v_user then
    raise exception 'own_code' using errcode = '22023';
  end if;
  update public.friend_invites
     set used_by = v_user, used_at = now()
   where code_hash = public.invitation_hash(p_code);
  insert into public.friendships (user_a, user_b)
    values (least(v_user, v_owner), greatest(v_user, v_owner))
    on conflict do nothing;
  return v_owner;
end;
$$;

-- Permissions ----------------------------------------------------------------------

-- Ce que `user_id` montre à `friend_id`. Pas de ligne : rien n'est montré.
create table public.share_grants (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  category public.share_category not null,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id, category),
  check (user_id <> friend_id)
);
create index share_grants_friend_id_idx on public.share_grants (friend_id);

alter table public.share_grants enable row level security;

-- L'ami voit ce qu'on lui montre, pour savoir quoi afficher. Il ne peut rien y changer.
create policy "share_grants_select_own_or_received" on public.share_grants
  for select to authenticated using ((select auth.uid()) in (user_id, friend_id));
create policy "share_grants_insert_own" on public.share_grants
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_friend(friend_id)));
create policy "share_grants_update_own" on public.share_grants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.is_friend(friend_id)));
create policy "share_grants_delete_own" on public.share_grants
  for delete to authenticated using (user_id = (select auth.uid()));

-- Retirer un ami retire tout ce que les deux se montraient.
create function public.clear_share_grants() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.share_grants g
   where (g.user_id = old.user_a and g.friend_id = old.user_b)
      or (g.user_id = old.user_b and g.friend_id = old.user_a);
  return old;
end;
$$;

create trigger friendships_clear_share_grants
  after delete on public.friendships
  for each row execute function public.clear_share_grants();

-- La seule porte du partage : amitié en place et permission active.
create function public.can_view(p_owner uuid, p_category public.share_category) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    p_owner = (select auth.uid())
    or (
      public.is_friend(p_owner)
      and exists (
        select 1 from public.share_grants g
         where g.user_id = p_owner and g.friend_id = (select auth.uid()) and g.category = p_category
      )
    )
  )
$$;

-- Lectures partagées -----------------------------------------------------------------

-- Mes amis : leur prénom (rien d'autre du profil), ce qu'ils me montrent, ce que je leur montre.
create function public.friends_overview()
returns table (friend_id uuid, display_name text, since timestamptz, shown_to_me public.share_category[], shown_by_me public.share_category[])
language sql stable security definer
set search_path = ''
as $$
  select o.other,
         p.display_name,
         o.created_at,
         coalesce((select array_agg(g.category order by g.category) from public.share_grants g where g.user_id = o.other and g.friend_id = (select auth.uid())), '{}'),
         coalesce((select array_agg(g.category order by g.category) from public.share_grants g where g.user_id = (select auth.uid()) and g.friend_id = o.other), '{}')
    from (
      select case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end as other, f.created_at
        from public.friendships f
       where (select auth.uid()) in (f.user_a, f.user_b)
    ) o
    left join public.profiles p on p.user_id = o.other
   order by p.display_name nulls last, o.created_at
$$;

-- Les 20 dernières séances terminées : jour, nom, durée, séries faites, volume. Pas de notes.
create function public.friend_workouts(p_owner uuid)
returns table (performed_on date, name text, minutes integer, sets integer, volume_kg numeric, is_light boolean)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.can_view(p_owner, 'seances') then
    raise exception 'not_shared' using errcode = '42501';
  end if;
  return query
    select w.performed_on,
           w.name,
           (extract(epoch from (w.ended_at - w.started_at)) / 60)::integer,
           count(s.id) filter (where s.completed_at is not null and not s.is_warmup)::integer,
           coalesce(sum(s.weight_kg * s.reps) filter (where s.completed_at is not null and not s.is_warmup), 0),
           w.is_light
      from public.workouts w
      left join public.workout_sets s on s.workout_id = w.id
     where w.user_id = p_owner and w.ended_at is not null
     group by w.id
     order by w.performed_on desc, w.started_at desc
     limit 20;
end;
$$;

-- Les 20 derniers sports notés.
create function public.friend_activities(p_owner uuid)
returns table (performed_on date, sport text, label text, duration_minutes smallint, intensity text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.can_view(p_owner, 'seances') then
    raise exception 'not_shared' using errcode = '42501';
  end if;
  return query
    select a.performed_on, a.sport::text, a.label, a.duration_minutes, a.intensity::text
      from public.activities a
     where a.user_id = p_owner
     order by a.performed_on desc, a.created_at desc
     limit 20;
end;
$$;

-- La meilleure série de chaque exercice (1RM estimé, formule d'Epley, 1 à 12 répétitions).
create function public.friend_records(p_owner uuid)
returns table (exercise_name text, weight_kg numeric, reps smallint, e1rm_kg numeric, performed_on date)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.can_view(p_owner, 'records') then
    raise exception 'not_shared' using errcode = '42501';
  end if;
  return query
    select b.name, b.weight_kg, b.reps, b.e1rm, b.performed_on
      from (
        select distinct on (s.exercise_id)
               e.name,
               s.weight_kg,
               s.reps,
               round(s.weight_kg * (1 + s.reps / 30.0), 1) as e1rm,
               w.performed_on
          from public.workout_sets s
          join public.workouts w on w.id = s.workout_id
          join public.exercises e on e.id = s.exercise_id
         where s.user_id = p_owner
           and s.completed_at is not null
           and not s.is_warmup
           and s.weight_kg > 0
           and s.reps between 1 and 12
         order by s.exercise_id, s.weight_kg * (1 + s.reps / 30.0) desc, w.performed_on
      ) b
     order by b.e1rm desc
     limit 30;
end;
$$;

-- Les pesées des 90 derniers jours. Pas les notes.
create function public.friend_weights(p_owner uuid)
returns table (measured_on date, weight_kg numeric)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.can_view(p_owner, 'poids') then
    raise exception 'not_shared' using errcode = '42501';
  end if;
  return query
    select b.measured_on, b.weight_kg
      from public.body_weights b
     where b.user_id = p_owner and b.measured_on > current_date - 90
     order by b.measured_on;
end;
$$;

-- La dernière mesure de chaque endroit du corps.
create function public.friend_measurements(p_owner uuid)
returns table (site text, value_cm numeric, measured_on date)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.can_view(p_owner, 'mensurations') then
    raise exception 'not_shared' using errcode = '42501';
  end if;
  return query
    select distinct on (m.site) m.site::text, m.value_cm, m.measured_on
      from public.body_measurements m
     where m.user_id = p_owner
     order by m.site, m.measured_on desc;
end;
$$;

-- Les totaux par jour des 7 derniers jours. Pas le détail des repas.
create function public.friend_nutrition(p_owner uuid)
returns table (eaten_on date, kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.can_view(p_owner, 'nutrition') then
    raise exception 'not_shared' using errcode = '42501';
  end if;
  return query
    select l.eaten_on,
           round(sum(l.grams * f.kcal / 100)),
           round(sum(l.grams * f.protein_g / 100)),
           round(sum(l.grams * f.carbs_g / 100)),
           round(sum(l.grams * f.fat_g / 100))
      from public.food_logs l
      join public.foods f on f.id = l.food_id
     where l.user_id = p_owner and l.eaten_on > current_date - 7
     group by l.eaten_on
     order by l.eaten_on desc;
end;
$$;

-- Les check-ins des 14 derniers jours.
create function public.friend_checkins(p_owner uuid)
returns table (checkin_on date, sleep smallint, soreness smallint, energy smallint, stress smallint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.can_view(p_owner, 'forme') then
    raise exception 'not_shared' using errcode = '42501';
  end if;
  return query
    select c.checkin_on, c.sleep, c.soreness, c.energy, c.stress
      from public.daily_checkins c
     where c.user_id = p_owner and c.checkin_on > current_date - 14
     order by c.checkin_on desc;
end;
$$;
