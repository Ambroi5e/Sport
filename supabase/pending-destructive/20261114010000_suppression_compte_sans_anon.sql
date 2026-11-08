-- À valider par Ambroise avant application (revoke).
--
-- delete_my_account() refuse déjà tout appel sans session (auth.uid() nul) :
-- ce revoke ne change rien au comportement. Il retire seulement au rôle anon le
-- droit de l'appeler, pour que l'outil d'alertes de Supabase ne la signale plus
-- comme « security definer appelable sans être connecté ».

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
