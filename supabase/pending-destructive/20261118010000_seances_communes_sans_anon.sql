-- Migration destructive (retire des droits) : EN ATTENTE de la validation d'Ambroise.
--
-- Pourquoi : mêmes raisons que 20261117010000_amis_sans_anon.sql. Ces fonctions
-- ne répondent rien d'utile sans session ; on ferme la porte par principe.
--
-- Effet : aucun pour les personnes connectées.

revoke execute on function public.share_set_with_group() from public, anon, authenticated;
revoke execute on function public.owns_group_session(uuid) from public, anon;
revoke execute on function public.is_group_participant(uuid) from public, anon;
revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.group_people(uuid) from public, anon;
