-- v0.11 : endurance. Six sports de plus et quatre colonnes facultatives sur les activités.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

alter type public.activity_sport add value if not exists 'course';
alter type public.activity_sport add value if not exists 'trail';
alter type public.activity_sport add value if not exists 'velo';
alter type public.activity_sport add value if not exists 'natation';
alter type public.activity_sport add value if not exists 'rameur';
alter type public.activity_sport add value if not exists 'marche';

-- Distance en mètres, secondes au-delà de `duration_minutes` (durée exacte =
-- minutes × 60 + secondes), dénivelé positif en mètres, fréquence cardiaque moyenne.
-- L'allure et la dépense se calculent à la lecture.
alter table public.activities
  add column distance_m integer check (distance_m between 50 and 1000000),
  add column duration_extra_s smallint not null default 0 check (duration_extra_s between 0 and 59),
  add column elevation_m smallint check (elevation_m between 0 and 20000),
  add column avg_hr smallint check (avg_hr between 30 and 240);
