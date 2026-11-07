-- Migration destructive (retire des droits) : validée par Ambroise le 2026-11-07,
-- appliquée le même jour.
--
-- Pourquoi : l'outil d'audit Supabase signale que des fonctions SECURITY DEFINER
-- sont appelables par les visiteurs non connectés (rôle anon). Aucune n'est
-- exploitable (elles vérifient le rôle admin, ou ne sont appelables que comme
-- déclencheur), mais retirer ces droits ferme la porte par principe.
--
-- Effet : aucun pour les utilisateurs. Les admins connectés gardent l'accès à
-- create_invitation et admin_stats ; les politiques RLS gardent is_admin.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_invitation(integer) from public, anon;
revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.is_admin() from public, anon;
