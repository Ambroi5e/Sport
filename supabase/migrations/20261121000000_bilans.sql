-- v0.10.2 : bilan du dimanche. Les chiffres du bilan se recalculent à la lecture ;
-- seuls le ressenti et la note de la personne sont enregistrés.

create table public.weekly_reviews (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Lundi de la semaine.
  week_start date not null check (extract(isodow from week_start) = 1),
  -- 1 = très dure … 5 = excellente.
  feeling smallint not null check (feeling between 1 and 5),
  note text check (char_length(note) between 1 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create trigger weekly_reviews_updated_at before update on public.weekly_reviews
  for each row execute function public.set_updated_at();

alter table public.weekly_reviews enable row level security;

create policy "weekly_reviews_select_own" on public.weekly_reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "weekly_reviews_insert_own" on public.weekly_reviews
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "weekly_reviews_update_own" on public.weekly_reviews
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "weekly_reviews_delete_own" on public.weekly_reviews
  for delete to authenticated using (user_id = (select auth.uid()));
