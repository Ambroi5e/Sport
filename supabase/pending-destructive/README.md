# Migrations destructives

Tout `drop`, `delete`, `revoke` ou `truncate` arrive ici, jamais dans `supabase/migrations/`. Ambroise valide chaque fichier avant que Claude ne l applique.
