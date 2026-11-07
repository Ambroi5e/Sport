-- v0.6.1 : recettes. Une recette est un aliment personnel dont les valeurs pour
-- 100 g viennent de ses ingrédients ; elle se note comme n'importe quel aliment.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

alter table public.foods
  add column is_recipe boolean not null default false,
  -- Poids total une fois cuit ; vide = somme des ingrédients crus.
  add column recipe_total_g numeric(7, 1) check (recipe_total_g > 0 and recipe_total_g <= 50000),
  add column recipe_portions smallint check (recipe_portions between 1 and 50),
  add constraint foods_recipe_fields check (is_recipe or (recipe_total_g is null and recipe_portions is null)),
  -- Le catalogue commun n'a pas de recette.
  add constraint foods_recipe_personal check (not is_recipe or user_id is not null),
  add constraint foods_id_user_key unique (id, user_id);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id uuid not null,
  food_id uuid not null references public.foods (id) on delete restrict,
  grams numeric(6, 1) not null check (grams > 0 and grams <= 10000),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  check (recipe_id <> food_id),
  -- Clé composite : un ingrédient ne peut appartenir qu'à une recette du même utilisateur.
  foreign key (recipe_id, user_id) references public.foods (id, user_id) on delete cascade
);

create index recipe_items_recipe_idx on public.recipe_items (recipe_id, user_id);
create index recipe_items_food_id_idx on public.recipe_items (food_id);
create index recipe_items_user_id_idx on public.recipe_items (user_id);

alter table public.recipe_items enable row level security;

create policy "recipe_items_select_own" on public.recipe_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "recipe_items_insert_own" on public.recipe_items
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.food_is_usable(food_id));
create policy "recipe_items_update_own" on public.recipe_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.food_is_usable(food_id));
create policy "recipe_items_delete_own" on public.recipe_items
  for delete to authenticated using (user_id = (select auth.uid()));
