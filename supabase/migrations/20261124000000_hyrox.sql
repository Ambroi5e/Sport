-- v0.11.1 : Hyrox. Un sport de plus et les seize temps d'une course sur l'activité.
-- Migration non destructive : aucune suppression, aucun retrait de droit.

alter type public.activity_sport add value if not exists 'hyrox';

-- Seize temps en secondes, dans l'ordre de l'épreuve : course 1, atelier 1, … course 8,
-- atelier 8. Un temps non noté est null. Le temps total reste la durée de l'activité.
-- `sport::text` : la valeur ajoutée ci-dessus n'est pas utilisable comme enum avant la
-- fin de la transaction.
alter table public.activities
  add column hyrox_splits integer[] check (
    hyrox_splits is null
    or (
      sport::text = 'hyrox'
      and array_ndims(hyrox_splits) = 1
      and cardinality(hyrox_splits) = 16
      and 1 <= all (hyrox_splits)
      and 7200 >= all (hyrox_splits)
    )
  );
