-- v0.4 : nutrition rapide. Aliments (catalogue commun et personnels), journal,
-- cibles par type de jour, repas favoris, jours habituels d'entraînement.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

create type public.meal as enum ('petit_dejeuner', 'dejeuner', 'collation', 'diner');
create type public.day_type as enum ('entrainement', 'repos');

-- Jours habituels d'entraînement (1 = lundi … 7 = dimanche) : décident de la cible du jour.
alter table public.profiles
  add column training_days smallint[] not null default '{}'
  check (training_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);

-- Aliments ---------------------------------------------------------------------
-- Valeurs pour 100 g. user_id vide = catalogue commun : lisible par les connectés,
-- modifiable par personne depuis l'app (les politiques d'écriture exigent user_id = auth.uid()).

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  slug text check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  brand text check (char_length(brand) between 1 and 60),
  kcal numeric(5, 1) not null check (kcal between 0 and 900),
  protein_g numeric(4, 1) not null check (protein_g between 0 and 100),
  carbs_g numeric(4, 1) not null check (carbs_g between 0 and 100),
  fat_g numeric(4, 1) not null check (fat_g between 0 and 100),
  fiber_g numeric(4, 1) check (fiber_g between 0 and 100),
  sugar_g numeric(4, 1) check (sugar_g between 0 and 100),
  salt_g numeric(4, 2) check (salt_g between 0 and 100),
  portion_g numeric(5, 1) check (portion_g > 0 and portion_g <= 2000),
  portion_label text check (char_length(portion_label) between 1 and 40),
  barcode text check (barcode ~ '^[0-9]{8,14}$'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (protein_g + carbs_g + fat_g <= 100),
  check ((portion_g is null) = (portion_label is null))
);

create unique index foods_catalogue_slug_idx on public.foods (slug) where user_id is null;
create index foods_user_id_idx on public.foods (user_id);

create trigger foods_updated_at before update on public.foods
  for each row execute function public.set_updated_at();

alter table public.foods enable row level security;

create policy "foods_select_catalogue_or_own" on public.foods
  for select to authenticated using (user_id is null or user_id = (select auth.uid()));
create policy "foods_insert_own" on public.foods
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "foods_update_own" on public.foods
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "foods_delete_own" on public.foods
  for delete to authenticated using (user_id = (select auth.uid()));

-- Vrai si l'aliment est utilisable par l'utilisateur courant (catalogue ou personnel).
create function public.food_is_usable(p_food_id uuid) returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.foods f
    where f.id = p_food_id and (f.user_id is null or f.user_id = (select auth.uid()))
  )
$$;

-- Journal ----------------------------------------------------------------------
-- Une ligne = un aliment, un jour, un repas, des grammes. Les totaux se calculent
-- à la lecture à partir des valeurs pour 100 g. L'identifiant peut venir du téléphone.

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  eaten_on date not null,
  meal public.meal not null,
  grams numeric(6, 1) not null check (grams > 0 and grams <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_logs_user_day_idx on public.food_logs (user_id, eaten_on);
create index food_logs_food_id_idx on public.food_logs (food_id);

create trigger food_logs_updated_at before update on public.food_logs
  for each row execute function public.set_updated_at();

alter table public.food_logs enable row level security;

create policy "food_logs_select_own" on public.food_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "food_logs_insert_own" on public.food_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.food_is_usable(food_id));
create policy "food_logs_update_own" on public.food_logs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.food_is_usable(food_id));
create policy "food_logs_delete_own" on public.food_logs
  for delete to authenticated using (user_id = (select auth.uid()));

-- Cibles par type de jour --------------------------------------------------------

create table public.nutrition_targets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day_type public.day_type not null,
  kcal smallint not null check (kcal between 800 and 8000),
  protein_g smallint not null check (protein_g between 0 and 500),
  carbs_g smallint check (carbs_g between 0 and 1500),
  fat_g smallint check (fat_g between 0 and 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_type)
);

create trigger nutrition_targets_updated_at before update on public.nutrition_targets
  for each row execute function public.set_updated_at();

alter table public.nutrition_targets enable row level security;

create policy "nutrition_targets_select_own" on public.nutrition_targets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "nutrition_targets_insert_own" on public.nutrition_targets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "nutrition_targets_update_own" on public.nutrition_targets
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "nutrition_targets_delete_own" on public.nutrition_targets
  for delete to authenticated using (user_id = (select auth.uid()));

-- Repas favoris ------------------------------------------------------------------

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  meal public.meal not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index saved_meals_user_id_idx on public.saved_meals (user_id);

create trigger saved_meals_updated_at before update on public.saved_meals
  for each row execute function public.set_updated_at();

alter table public.saved_meals enable row level security;

create policy "saved_meals_select_own" on public.saved_meals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_meals_insert_own" on public.saved_meals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved_meals_update_own" on public.saved_meals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved_meals_delete_own" on public.saved_meals
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  saved_meal_id uuid not null,
  food_id uuid not null references public.foods (id) on delete restrict,
  grams numeric(6, 1) not null check (grams > 0 and grams <= 5000),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  -- Clé composite : un élément ne peut appartenir qu'à un favori du même utilisateur.
  foreign key (saved_meal_id, user_id) references public.saved_meals (id, user_id) on delete cascade
);

create index saved_meal_items_meal_idx on public.saved_meal_items (saved_meal_id, user_id);
create index saved_meal_items_user_id_idx on public.saved_meal_items (user_id);
create index saved_meal_items_food_id_idx on public.saved_meal_items (food_id);

alter table public.saved_meal_items enable row level security;

create policy "saved_meal_items_select_own" on public.saved_meal_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_meal_items_insert_own" on public.saved_meal_items
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.food_is_usable(food_id));
create policy "saved_meal_items_update_own" on public.saved_meal_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.food_is_usable(food_id));
create policy "saved_meal_items_delete_own" on public.saved_meal_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Catalogue commun -------------------------------------------------------------------
-- Valeurs moyennes pour 100 g, arrondies, d'après les tables Ciqual (Anses) et USDA.
-- Glucides hors fibres, comme sur les étiquettes européennes. À vérifier sur l'emballage.

insert into public.foods (user_id, slug, name, kcal, protein_g, carbs_g, fat_g, portion_g, portion_label) values
  -- Féculents et céréales
  (null, 'flocons-avoine', 'Flocons d''avoine', 370, 13.5, 58.7, 7.0, 40, '1 bol (40 g)'),
  (null, 'riz-blanc-cru', 'Riz blanc cru', 350, 7.5, 77.0, 0.6, null, null),
  (null, 'riz-blanc-cuit', 'Riz blanc cuit', 130, 2.7, 28.2, 0.3, null, null),
  (null, 'riz-complet-cuit', 'Riz complet cuit', 120, 2.7, 24.5, 1.0, null, null),
  (null, 'pates-crues', 'Pâtes crues', 355, 12.5, 70.0, 1.5, null, null),
  (null, 'pates-cuites', 'Pâtes cuites', 150, 5.3, 30.0, 0.9, null, null),
  (null, 'semoule-cuite', 'Semoule cuite', 112, 3.8, 23.2, 0.2, null, null),
  (null, 'quinoa-cuit', 'Quinoa cuit', 120, 4.4, 21.3, 1.9, null, null),
  (null, 'pomme-de-terre-cuite', 'Pomme de terre cuite à l''eau', 80, 2.0, 17.0, 0.1, null, null),
  (null, 'patate-douce-cuite', 'Patate douce cuite', 90, 2.0, 20.7, 0.2, null, null),
  (null, 'frites-four', 'Frites cuites au four', 165, 2.5, 24.0, 6.0, null, null),
  (null, 'pain-baguette', 'Pain, baguette', 270, 9.0, 55.0, 1.3, 50, '1 morceau (50 g)'),
  (null, 'pain-complet', 'Pain complet', 240, 9.5, 43.0, 2.8, 40, '1 tranche'),
  (null, 'pain-de-mie', 'Pain de mie', 270, 8.5, 48.0, 4.5, 25, '1 tranche'),
  (null, 'galette-riz', 'Galette de riz soufflé', 387, 8.0, 81.0, 2.8, 9, '1 galette'),
  (null, 'corn-flakes', 'Pétales de maïs (corn flakes)', 378, 7.5, 84.0, 0.9, 30, '1 bol (30 g)'),
  (null, 'lentilles-cuites', 'Lentilles cuites', 116, 9.0, 20.1, 0.4, null, null),
  (null, 'pois-chiches-cuits', 'Pois chiches cuits', 164, 8.9, 27.4, 2.6, null, null),
  (null, 'haricots-rouges-cuits', 'Haricots rouges cuits', 127, 8.7, 22.8, 0.5, null, null),
  -- Viandes, poissons, œufs
  (null, 'poulet-blanc-cru', 'Blanc de poulet cru', 120, 22.5, 0, 2.6, null, null),
  (null, 'poulet-blanc-cuit', 'Blanc de poulet cuit', 165, 31.0, 0, 3.6, null, null),
  (null, 'dinde-escalope-crue', 'Escalope de dinde crue', 110, 24.0, 0, 1.5, null, null),
  (null, 'steak-hache-5-cru', 'Steak haché 5 % MG cru', 137, 21.4, 0, 5.0, 100, '1 steak (100 g)'),
  (null, 'steak-hache-15-cru', 'Steak haché 15 % MG cru', 215, 18.6, 0, 15.0, 100, '1 steak (100 g)'),
  (null, 'boeuf-rumsteck-cru', 'Bœuf, rumsteck cru', 125, 22.0, 0, 4.0, null, null),
  (null, 'porc-filet-mignon-cru', 'Porc, filet mignon cru', 120, 20.9, 0, 3.5, null, null),
  (null, 'jambon-blanc', 'Jambon blanc', 115, 20.0, 1.0, 3.5, 40, '1 tranche'),
  (null, 'saumon-cru', 'Saumon cru', 208, 20.4, 0, 13.4, null, null),
  (null, 'cabillaud-cru', 'Cabillaud cru', 82, 17.8, 0, 0.7, null, null),
  (null, 'thon-naturel', 'Thon au naturel, égoutté', 116, 25.5, 0, 0.8, 100, '1 boîte égouttée'),
  (null, 'sardines-huile', 'Sardines à l''huile, égouttées', 208, 24.6, 0, 11.5, null, null),
  (null, 'crevettes-cuites', 'Crevettes cuites', 99, 24.0, 0.2, 0.3, null, null),
  (null, 'oeuf', 'Œuf entier', 143, 12.6, 0.7, 9.5, 55, '1 œuf'),
  (null, 'blanc-oeuf', 'Blanc d''œuf', 52, 10.9, 0.7, 0.2, 33, '1 blanc'),
  (null, 'tofu', 'Tofu nature', 125, 13.0, 1.5, 7.5, null, null),
  -- Produits laitiers
  (null, 'lait-demi-ecreme', 'Lait demi-écrémé', 46, 3.3, 4.8, 1.6, 250, '1 bol (250 ml)'),
  (null, 'lait-ecreme', 'Lait écrémé', 34, 3.4, 4.9, 0.2, 250, '1 bol (250 ml)'),
  (null, 'lait-entier', 'Lait entier', 64, 3.2, 4.7, 3.6, 250, '1 bol (250 ml)'),
  (null, 'yaourt-nature', 'Yaourt nature', 55, 4.2, 5.5, 1.6, 125, '1 pot'),
  (null, 'fromage-blanc-0', 'Fromage blanc 0 %', 47, 7.5, 4.0, 0.2, 100, '1 pot (100 g)'),
  (null, 'fromage-blanc-3', 'Fromage blanc 3 %', 74, 7.0, 4.0, 3.3, 100, '1 pot (100 g)'),
  (null, 'skyr', 'Skyr nature', 60, 10.5, 4.0, 0.2, 150, '1 pot (150 g)'),
  (null, 'emmental', 'Emmental', 380, 28.5, 0, 29.5, 30, '1 portion (30 g)'),
  (null, 'comte', 'Comté', 410, 27.0, 0.5, 33.6, 30, '1 portion (30 g)'),
  (null, 'mozzarella', 'Mozzarella', 247, 18.0, 1.0, 19.0, 125, '1 boule'),
  (null, 'beurre', 'Beurre', 745, 0.7, 0.6, 82.0, 10, '1 noisette (10 g)'),
  (null, 'creme-fraiche-30', 'Crème fraîche épaisse 30 %', 292, 2.4, 3.0, 30.0, 15, '1 c. à soupe'),
  (null, 'whey', 'Protéine en poudre (whey, moyenne)', 380, 78.0, 6.0, 5.0, 30, '1 dose (30 g)'),
  -- Fruits
  (null, 'banane', 'Banane', 90, 1.1, 20.0, 0.3, 120, '1 banane'),
  (null, 'pomme', 'Pomme', 53, 0.3, 11.6, 0.2, 150, '1 pomme'),
  (null, 'orange', 'Orange', 47, 0.9, 9.4, 0.2, 150, '1 orange'),
  (null, 'kiwi', 'Kiwi', 58, 1.1, 10.5, 0.6, 75, '1 kiwi'),
  (null, 'fraises', 'Fraises', 32, 0.7, 6.0, 0.3, null, null),
  (null, 'myrtilles', 'Myrtilles', 57, 0.7, 12.0, 0.3, null, null),
  (null, 'avocat', 'Avocat', 160, 2.0, 1.8, 14.7, 100, '1/2 avocat'),
  (null, 'dattes', 'Dattes', 282, 2.5, 67.0, 0.4, 8, '1 datte'),
  (null, 'raisins-secs', 'Raisins secs', 300, 3.1, 75.0, 0.5, null, null),
  (null, 'compote-sans-sucre', 'Compote sans sucres ajoutés', 52, 0.3, 11.5, 0.2, 100, '1 pot'),
  -- Légumes
  (null, 'brocoli-cuit', 'Brocoli cuit', 35, 2.4, 3.9, 0.4, null, null),
  (null, 'haricots-verts-cuits', 'Haricots verts cuits', 33, 1.9, 4.7, 0.2, null, null),
  (null, 'courgette-cuite', 'Courgette cuite', 17, 1.2, 2.4, 0.3, null, null),
  (null, 'epinards-cuits', 'Épinards cuits', 23, 3.0, 1.4, 0.3, null, null),
  (null, 'petits-pois-cuits', 'Petits pois cuits', 80, 5.4, 10.0, 0.4, null, null),
  (null, 'carotte', 'Carotte crue', 36, 0.8, 7.0, 0.3, null, null),
  (null, 'tomate', 'Tomate', 18, 0.9, 2.7, 0.2, 120, '1 tomate'),
  (null, 'salade-verte', 'Salade verte', 15, 1.3, 1.7, 0.2, null, null),
  (null, 'champignons-paris', 'Champignons de Paris', 22, 3.1, 2.3, 0.3, null, null),
  (null, 'poivron', 'Poivron', 30, 1.0, 4.5, 0.3, null, null),
  (null, 'oignon', 'Oignon', 40, 1.1, 7.6, 0.1, null, null),
  (null, 'mais-doux', 'Maïs doux en conserve, égoutté', 80, 2.6, 14.5, 1.2, null, null),
  -- Matières grasses, oléagineux, sucré
  (null, 'huile-olive', 'Huile d''olive', 900, 0, 0, 100.0, 10, '1 c. à soupe'),
  (null, 'beurre-cacahuete', 'Beurre de cacahuète', 600, 25.0, 13.0, 50.0, 15, '1 c. à soupe'),
  (null, 'amandes', 'Amandes', 595, 21.2, 9.1, 49.9, 30, '1 poignée (30 g)'),
  (null, 'noix', 'Noix', 680, 15.2, 7.0, 65.2, 30, '1 poignée (30 g)'),
  (null, 'noix-cajou', 'Noix de cajou', 598, 18.2, 27.0, 46.4, 30, '1 poignée (30 g)'),
  (null, 'chocolat-noir-70', 'Chocolat noir 70 %', 565, 9.5, 34.0, 41.0, 10, '1 carré'),
  (null, 'pate-tartiner', 'Pâte à tartiner chocolat-noisettes', 539, 6.3, 57.5, 30.9, 15, '1 c. à soupe'),
  (null, 'miel', 'Miel', 304, 0.3, 82.0, 0, 7, '1 c. à café'),
  (null, 'confiture', 'Confiture', 248, 0.4, 61.0, 0.1, 15, '1 c. à soupe'),
  (null, 'sucre', 'Sucre', 400, 0, 100.0, 0, 5, '1 morceau'),
  -- Plats, sauces, boissons
  (null, 'pizza-margherita', 'Pizza margherita', 245, 10.0, 30.0, 9.5, null, null),
  (null, 'houmous', 'Houmous', 275, 7.5, 13.0, 21.0, null, null),
  (null, 'sauce-tomate', 'Sauce tomate', 43, 1.5, 6.0, 1.0, null, null),
  (null, 'ketchup', 'Ketchup', 102, 1.2, 23.2, 0.1, 15, '1 c. à soupe'),
  (null, 'mayonnaise', 'Mayonnaise', 700, 1.1, 1.3, 77.0, 15, '1 c. à soupe'),
  (null, 'jus-orange', 'Jus d''orange 100 % pur jus', 44, 0.7, 9.9, 0.2, 200, '1 verre'),
  (null, 'soda-cola', 'Soda au cola', 42, 0, 10.6, 0, 330, '1 canette'),
  (null, 'biere-blonde', 'Bière blonde (5 %)', 43, 0.5, 3.6, 0, 250, '1 demi');
