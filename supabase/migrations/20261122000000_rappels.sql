-- v0.10.3 : rappels push. Réglages, appareils abonnés, dernier envoi, et l'envoi
-- programmé en base (pg_cron + pg_net vers l'Edge Function `rappels`, clés dans Vault).
-- Migration non destructive : aucune suppression, aucun retrait de droit.

-- Réglages -----------------------------------------------------------------------
-- Une ligne par personne. Une heure vide = rappel éteint. Heures dans le fuseau du profil.

create table public.reminder_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  workout_at time,
  -- Jours du rappel de séance : 1 = lundi … 7 = dimanche.
  workout_days smallint[] not null default '{1,2,3,4,5,6,7}'
    check (workout_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[] and cardinality(workout_days) <= 7),
  checkin_at time,
  supplements_at time,
  review_at time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reminder_settings_updated_at before update on public.reminder_settings
  for each row execute function public.set_updated_at();

alter table public.reminder_settings enable row level security;

create policy "reminder_settings_select_own" on public.reminder_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reminder_settings_insert_own" on public.reminder_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reminder_settings_update_own" on public.reminder_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reminder_settings_delete_own" on public.reminder_settings
  for delete to authenticated using (user_id = (select auth.uid()));

-- Appareils ----------------------------------------------------------------------
-- L'adresse du signal donnée par le navigateur, rien d'autre : le signal part vide.
-- Seuls les services de notifications connus sont acceptés (pas d'adresse arbitraire).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null check (
    char_length(endpoint) <= 1000
    and endpoint ~ '^https://([a-z0-9-]+\.)*(googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)/'
  ),
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Dernier envoi --------------------------------------------------------------------
-- Une ligne par personne et par rappel. Sert à ne pas envoyer deux fois le même jour,
-- et au service worker pour savoir quoi afficher quand le signal arrive.

create table public.reminder_log (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('seance', 'forme', 'complements', 'bilan')),
  sent_on date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.reminder_log enable row level security;

create policy "reminder_log_select_own" on public.reminder_log
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reminder_log_insert_own" on public.reminder_log
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reminder_log_update_own" on public.reminder_log
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reminder_log_delete_own" on public.reminder_log
  for delete to authenticated using (user_id = (select auth.uid()));

-- Envoi programmé ------------------------------------------------------------------
-- Le schéma `private` n'est pas exposé par l'API et les rôles `anon` et
-- `authenticated` n'y ont aucun droit : ces fonctions ne s'appellent que depuis la base.

create schema if not exists private;

-- Qui doit recevoir quoi : l'heure locale est atteinte depuis moins d'une heure, le
-- rappel n'est pas encore parti aujourd'hui, il est encore utile, et un appareil est abonné.
create function private.due_reminders(p_now timestamptz default now())
returns table (user_id uuid, kind text, local_day date)
language sql stable
set search_path = ''
as $$
  with people as (
    select r.*, (p_now at time zone p.timezone) as local_ts
      from public.reminder_settings r
      join public.profiles p on p.user_id = r.user_id
     where exists (select 1 from public.push_subscriptions s where s.user_id = r.user_id)
  ),
  candidates as (
    select c.user_id, c.local_ts::date as local_day, k.kind
      from people c
     cross join lateral (values
       ('seance', c.workout_at), ('forme', c.checkin_at), ('complements', c.supplements_at), ('bilan', c.review_at)
     ) as k (kind, at)
     where k.at is not null
       and c.local_ts::time >= k.at
       and c.local_ts::time - k.at < interval '1 hour'
       and (k.kind <> 'seance' or extract(isodow from c.local_ts)::smallint = any (c.workout_days))
       and (k.kind <> 'bilan' or extract(isodow from c.local_ts) = 7)
  )
  select c.user_id, c.kind, c.local_day
    from candidates c
   where not exists (
           select 1 from public.reminder_log l where l.user_id = c.user_id and l.kind = c.kind and l.sent_on = c.local_day)
     and case c.kind
           when 'seance' then not exists (
             select 1 from public.workouts w where w.user_id = c.user_id and w.performed_on = c.local_day)
           when 'forme' then not exists (
             select 1 from public.daily_checkins d where d.user_id = c.user_id and d.checkin_on = c.local_day)
           when 'complements' then exists (
             select 1 from public.supplements s
              where s.user_id = c.user_id and s.paused_at is null
                and not exists (
                  select 1 from public.supplement_logs g where g.supplement_id = s.id and g.taken_on = c.local_day))
           else not exists (
             select 1 from public.weekly_reviews v
              where v.user_id = c.user_id and v.week_start = c.local_day - 6)
         end;
$$;

-- Note les envois et poste les adresses à l'Edge Function, avec la paire de clés VAPID
-- qui signe les signaux. L'adresse de la fonction et les clés sont dans Supabase Vault :
-- la fonction ne garde aucun secret. Sans eux, rien n'est noté ni envoyé.
create function private.dispatch_reminders()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_url text;
  v_public text;
  v_private text;
  v_endpoints jsonb;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'rappels_function_url';
  select decrypted_secret into v_public from vault.decrypted_secrets where name = 'rappels_vapid_public';
  select decrypted_secret into v_private from vault.decrypted_secrets where name = 'rappels_vapid_private_jwk';
  if v_url is null or v_public is null or v_private is null then
    return 0;
  end if;

  with marked as (
    insert into public.reminder_log (user_id, kind, sent_on, sent_at)
    select d.user_id, d.kind, d.local_day, now() from private.due_reminders(now()) d
    on conflict (user_id, kind) do update set sent_on = excluded.sent_on, sent_at = excluded.sent_at
    returning user_id
  )
  select coalesce(jsonb_agg(distinct s.endpoint), '[]'::jsonb) into v_endpoints
    from public.push_subscriptions s
   where s.user_id in (select m.user_id from marked m);

  if jsonb_array_length(v_endpoints) > 0 then
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('endpoints', v_endpoints, 'publicKey', v_public, 'privateJwk', v_private::jsonb),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;
  return jsonb_array_length(v_endpoints);
end;
$$;

-- La clé publique VAPID, dont le navigateur a besoin pour abonner l'appareil.
-- Publique par nature ; `null` tant que les rappels ne sont pas installés.
create function public.push_public_key()
returns text
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_public text;
begin
  if not exists (select 1 from pg_catalog.pg_namespace where nspname = 'vault') then
    return null;
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into v_public using 'rappels_vapid_public';
  return v_public;
end;
$$;

-- Toutes les 5 minutes, là où pg_cron et pg_net existent (Supabase). Ailleurs
-- (Postgres de test), les tables et les fonctions suffisent.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create schema if not exists extensions;
    create extension if not exists pg_net with schema extensions;
    perform cron.schedule('fonte-rappels', '*/5 * * * *', 'select private.dispatch_reminders()');
  end if;
end;
$$;
