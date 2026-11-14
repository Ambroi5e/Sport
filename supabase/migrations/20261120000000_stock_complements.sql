-- v0.10.1 : stock de la maison, compléments et prises du jour.

-- Stock ------------------------------------------------------------------------------
-- Ce qu'on a chez soi. `food_id` et `grams` viennent de la liste de courses quand
-- l'article en vient : ils permettent de déduire le stock de ce qu'il faut racheter.

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  quantity text check (char_length(quantity) between 1 and 30),
  aisle public.grocery_aisle not null default 'autre',
  food_id uuid references public.foods (id) on delete set null,
  grams numeric(7, 1) check (grams > 0 and grams <= 100000),
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stock_items_user_idx on public.stock_items (user_id, expires_on);
create index stock_items_food_id_idx on public.stock_items (food_id);

create trigger stock_items_updated_at before update on public.stock_items
  for each row execute function public.set_updated_at();

alter table public.stock_items enable row level security;

create policy "stock_items_select_own" on public.stock_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "stock_items_insert_own" on public.stock_items
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (food_id is null or public.food_is_usable(food_id)));
create policy "stock_items_update_own" on public.stock_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (food_id is null or public.food_is_usable(food_id)));
create policy "stock_items_delete_own" on public.stock_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Compléments ------------------------------------------------------------------------
-- La liste de la personne. Aucun catalogue, aucune dose proposée.

create type public.supplement_moment as enum ('matin', 'midi', 'soir', 'avant_seance', 'apres_seance', 'coucher');

create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  dose text check (char_length(dose) between 1 and 30),
  moment public.supplement_moment not null default 'matin',
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index supplements_user_idx on public.supplements (user_id, created_at);

create trigger supplements_updated_at before update on public.supplements
  for each row execute function public.set_updated_at();

alter table public.supplements enable row level security;

create policy "supplements_select_own" on public.supplements
  for select to authenticated using (user_id = (select auth.uid()));
create policy "supplements_insert_own" on public.supplements
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "supplements_update_own" on public.supplements
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "supplements_delete_own" on public.supplements
  for delete to authenticated using (user_id = (select auth.uid()));

-- Prises : une ligne par complément et par jour. La clé étrangère composée garantit
-- qu'on ne coche que ses propres compléments.

create table public.supplement_logs (
  supplement_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  taken_on date not null,
  created_at timestamptz not null default now(),
  primary key (supplement_id, taken_on),
  foreign key (supplement_id, user_id) references public.supplements (id, user_id) on delete cascade
);
create index supplement_logs_user_day_idx on public.supplement_logs (user_id, taken_on);

alter table public.supplement_logs enable row level security;

create policy "supplement_logs_select_own" on public.supplement_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "supplement_logs_insert_own" on public.supplement_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "supplement_logs_update_own" on public.supplement_logs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "supplement_logs_delete_own" on public.supplement_logs
  for delete to authenticated using (user_id = (select auth.uid()));
