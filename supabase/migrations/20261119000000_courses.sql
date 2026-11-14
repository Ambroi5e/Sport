-- v0.10 : liste de courses, prix au kilo, achats et budget de la semaine.

create type public.grocery_aisle as enum (
  'fruits_legumes', 'viandes_poissons', 'frais', 'feculents', 'epicerie', 'surgeles', 'boissons', 'hygiene', 'autre'
);

-- Budget de la semaine, en euros. Vide par défaut : chacun met le sien.
alter table public.profiles
  add column weekly_food_budget numeric(6, 2) check (weekly_food_budget between 1 and 2000);

-- Liste de courses -----------------------------------------------------------------
-- Une seule liste par personne. `food_id` relie l'article à un aliment quand il
-- vient des repas : c'est ce qui permet d'estimer son coût.

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  quantity text check (char_length(quantity) between 1 and 30),
  aisle public.grocery_aisle not null default 'autre',
  food_id uuid references public.foods (id) on delete set null,
  grams numeric(7, 1) check (grams > 0 and grams <= 100000),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shopping_items_user_idx on public.shopping_items (user_id, created_at);
create index shopping_items_food_id_idx on public.shopping_items (food_id);

create trigger shopping_items_updated_at before update on public.shopping_items
  for each row execute function public.set_updated_at();

alter table public.shopping_items enable row level security;

create policy "shopping_items_select_own" on public.shopping_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "shopping_items_insert_own" on public.shopping_items
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (food_id is null or public.food_is_usable(food_id)));
create policy "shopping_items_update_own" on public.shopping_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (food_id is null or public.food_is_usable(food_id)));
create policy "shopping_items_delete_own" on public.shopping_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Prix au kilo -----------------------------------------------------------------------
-- Saisi par la personne, pour un aliment du catalogue ou à elle.

create table public.food_prices (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  price_per_kg numeric(6, 2) not null check (price_per_kg > 0 and price_per_kg <= 1000),
  updated_at timestamptz not null default now(),
  primary key (user_id, food_id)
);
create index food_prices_food_id_idx on public.food_prices (food_id);

create trigger food_prices_updated_at before update on public.food_prices
  for each row execute function public.set_updated_at();

alter table public.food_prices enable row level security;

create policy "food_prices_select_own" on public.food_prices
  for select to authenticated using (user_id = (select auth.uid()));
create policy "food_prices_insert_own" on public.food_prices
  for insert to authenticated with check (user_id = (select auth.uid()) and public.food_is_usable(food_id));
create policy "food_prices_update_own" on public.food_prices
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.food_is_usable(food_id));
create policy "food_prices_delete_own" on public.food_prices
  for delete to authenticated using (user_id = (select auth.uid()));

-- Achats -----------------------------------------------------------------------------
-- Le montant d'un ticket de caisse, pour suivre le budget de la semaine.

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  purchased_on date not null,
  amount numeric(7, 2) not null check (amount > 0 and amount <= 5000),
  store text check (char_length(store) between 1 and 40),
  created_at timestamptz not null default now()
);
create index purchases_user_day_idx on public.purchases (user_id, purchased_on);

alter table public.purchases enable row level security;

create policy "purchases_select_own" on public.purchases
  for select to authenticated using (user_id = (select auth.uid()));
create policy "purchases_insert_own" on public.purchases
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "purchases_update_own" on public.purchases
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "purchases_delete_own" on public.purchases
  for delete to authenticated using (user_id = (select auth.uid()));
