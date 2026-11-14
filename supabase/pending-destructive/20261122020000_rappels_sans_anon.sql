-- Migration destructive (retire des droits) : EN ATTENTE de la validation d'Ambroise.
--
-- Pourquoi : l'outil d'audit Supabase signale les fonctions SECURITY DEFINER
-- appelables par les visiteurs non connectés (rôle anon). `push_public_key` ne rend
-- qu'une clé publique, mais seules les personnes connectées en ont besoin.
--
-- Effet : aucun pour les personnes connectées.

revoke execute on function public.push_public_key() from public, anon;
