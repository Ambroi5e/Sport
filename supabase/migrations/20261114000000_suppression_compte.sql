-- Suppression du compte par la personne elle-même (v0.7), sans clé service_role.
--
-- Supprimer sa ligne auth.users suffit : toutes les tables de public suivent
-- (on delete cascade), les invitations gardent leur trace sans elle (on delete
-- set null), et Supabase efface ses sessions et identités.
--
-- Supabase interdit d'effacer un fichier de Storage en SQL. Le serveur efface
-- donc d'abord le dossier de photos par l'API Storage (au nom de la personne,
-- sous RLS), et la fonction refuse tant qu'il en reste un : jamais de photo
-- orpheline. Le propriétaire de la fonction (postgres) lit storage.objects sans
-- la RLS, il voit donc bien tous les fichiers.
--
-- Migration non destructive : elle crée une fonction et n'efface rien. Appelée
-- sans session, la fonction refuse. Lui retirer en plus son execute pour anon
-- est un revoke : supabase/pending-destructive/.

create function public.delete_my_account() returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if exists (
    select 1
      from storage.objects
     where bucket_id = 'progress-photos'
       and (storage.foldername(name))[1] = v_user::text
  ) then
    raise exception 'photos_remaining' using errcode = 'P0001';
  end if;

  delete from auth.users where id = v_user;
end;
$$;

comment on function public.delete_my_account() is
  'Supprime le compte de la personne connectée et, par cascade, toutes ses données. Refuse s''il reste des photos dans Storage.';
