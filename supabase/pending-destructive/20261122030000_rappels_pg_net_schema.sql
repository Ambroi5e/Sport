-- Migration destructive (supprime puis recrée une extension) : EN ATTENTE de la validation d'Ambroise.
--
-- Pourquoi : sur le projet d'Ambroise, `pg_net` a été installée le 2026-11-14 dans le
-- schéma `public`, ce que l'audit Supabase signale (« Extension in Public »). Elle ne
-- se déplace pas : il faut la retirer et la remettre dans `extensions`. La migration
-- `20261122000000_rappels.sql` l'installe désormais au bon endroit pour une base neuve.
--
-- Effet : l'historique des appels sortants (`net._http_response`, gardé quelques
-- heures) est vidé. Les rappels reprennent à la tâche suivante, cinq minutes plus tard
-- au plus. Les fonctions `net.http_post` restent dans le schéma `net`.

drop extension if exists pg_net;
create extension pg_net with schema extensions;
