-- v0.6.2 : code-barres et photo d'étiquette. Un produit scanné une fois se
-- retrouve au scan suivant : un seul aliment actif par code-barres et par personne.
-- Migration non destructive : un index, aucune suppression, aucun retrait de droit.

create unique index foods_user_barcode_idx on public.foods (user_id, barcode)
  where barcode is not null and archived_at is null;
