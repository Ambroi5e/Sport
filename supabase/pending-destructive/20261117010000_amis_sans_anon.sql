-- Migration destructive (retire des droits) : EN ATTENTE de la validation d'Ambroise.
--
-- Pourquoi : l'outil d'audit Supabase signale les fonctions SECURITY DEFINER
-- appelables par les visiteurs non connectés (rôle anon). Celles des amis refusent
-- déjà sans session (elles lèvent une erreur ou ne renvoient rien), mais retirer
-- ce droit ferme la porte par principe.
--
-- Effet : aucun pour les personnes connectées.

revoke execute on function public.clear_share_grants() from public, anon, authenticated;
revoke execute on function public.is_friend(uuid) from public, anon;
revoke execute on function public.can_view(uuid, public.share_category) from public, anon;
revoke execute on function public.create_friend_invite() from public, anon;
revoke execute on function public.accept_friend_invite(text) from public, anon;
revoke execute on function public.friends_overview() from public, anon;
revoke execute on function public.friend_workouts(uuid) from public, anon;
revoke execute on function public.friend_activities(uuid) from public, anon;
revoke execute on function public.friend_records(uuid) from public, anon;
revoke execute on function public.friend_weights(uuid) from public, anon;
revoke execute on function public.friend_measurements(uuid) from public, anon;
revoke execute on function public.friend_nutrition(uuid) from public, anon;
revoke execute on function public.friend_checkins(uuid) from public, anon;
