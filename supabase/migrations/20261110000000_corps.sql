-- v0.5 : corps et progrès. Mensurations, photos de progression privées.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

create type public.body_site as enum (
  'cou', 'epaules', 'poitrine', 'bras', 'avant_bras', 'taille', 'hanches', 'cuisse', 'mollet'
);
create type public.photo_pose as enum ('face', 'profil', 'dos');

-- Mensurations --------------------------------------------------------------------
-- Une valeur par zone et par jour ; ressaisir le même jour remplace la valeur.

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null,
  site public.body_site not null,
  value_cm numeric(4, 1) not null check (value_cm between 10 and 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, measured_on, site)
);

create trigger body_measurements_updated_at before update on public.body_measurements
  for each row execute function public.set_updated_at();

alter table public.body_measurements enable row level security;

create policy "body_measurements_select_own" on public.body_measurements
  for select to authenticated using (user_id = (select auth.uid()));
create policy "body_measurements_insert_own" on public.body_measurements
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "body_measurements_update_own" on public.body_measurements
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "body_measurements_delete_own" on public.body_measurements
  for delete to authenticated using (user_id = (select auth.uid()));

-- Photos de progression -----------------------------------------------------------
-- Le fichier vit dans le bucket privé progress-photos, sous <user_id>/<id>.jpg.
-- Le chemin est imposé par la contrainte : impossible de pointer vers le dossier d'un autre.

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  taken_on date not null,
  pose public.photo_pose not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  check (storage_path = user_id::text || '/' || id::text || '.jpg')
);

create index progress_photos_user_taken_idx on public.progress_photos (user_id, taken_on desc);

alter table public.progress_photos enable row level security;

create policy "progress_photos_select_own" on public.progress_photos
  for select to authenticated using (user_id = (select auth.uid()));
create policy "progress_photos_insert_own" on public.progress_photos
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "progress_photos_update_own" on public.progress_photos
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "progress_photos_delete_own" on public.progress_photos
  for delete to authenticated using (user_id = (select auth.uid()));

-- Stockage ------------------------------------------------------------------------
-- Bucket privé : aucune URL publique, lecture par liens signés de courte durée.
-- JPEG seulement (réencodé sur le téléphone, sans EXIF), 1 Mo au plus.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

create policy "progress_photos_files_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress_photos_files_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress_photos_files_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
