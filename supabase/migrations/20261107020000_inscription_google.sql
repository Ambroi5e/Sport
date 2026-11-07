-- Inscription avec Google, toujours sur invitation.
--
-- Avec Google, Supabase crée le compte au retour de Google : on ne peut pas y
-- glisser le code d'invitation comme pour l'e-mail. L'app réserve donc
-- l'invitation pour l'adresse saisie juste avant de partir vers Google
-- (15 minutes), et le déclencheur la consomme si le compte Google a cette
-- même adresse. Sans réservation valable, le compte n'est pas créé.
--
-- Migration non destructive : deux colonnes, une fonction, et le déclencheur
-- d'inscription remplacé (ses droits restent ceux déjà en place).

alter table public.invitations
  add column reserved_email text check (reserved_email = lower(reserved_email) and char_length(reserved_email) <= 254),
  add column reserved_until timestamptz;

create index invitations_reserved_email_idx on public.invitations (reserved_email) where used_by is null;

-- Appelable sans être connecté (page d'inscription). Ne révèle rien de plus que
-- le formulaire d'inscription par e-mail : un code valable ou non.
create function public.reserve_invitation(p_code text, p_email text) returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
begin
  if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return false;
  end if;

  update public.invitations
     set reserved_email = v_email,
         reserved_until = now() + interval '15 minutes'
   where code_hash = public.invitation_hash(p_code)
     and used_by is null
     and expires_at > now()
  returning id into v_id;

  return v_id is not null;
end;
$$;

grant execute on function public.reserve_invitation(text, text) to anon, authenticated;

-- Le code d'invitation arrive dans les métadonnées (inscription par e-mail) ;
-- sinon, on cherche une invitation réservée pour l'adresse du compte (Google).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_invitation uuid;
begin
  if new.raw_user_meta_data ? 'invite_code' then
    update public.invitations
       set used_by = new.id, used_at = now()
     where code_hash = public.invitation_hash(new.raw_user_meta_data ->> 'invite_code')
       and used_by is null
       and expires_at > now()
    returning id into v_invitation;
  else
    update public.invitations
       set used_by = new.id, used_at = now()
     where used_by is null
       and id = (
         select i.id
           from public.invitations i
          where i.reserved_email = lower(new.email)
            and i.reserved_until > now()
            and i.used_by is null
            and i.expires_at > now()
          order by i.reserved_until desc
          limit 1
       )
    returning id into v_invitation;
  end if;

  if v_invitation is null then
    raise exception 'invitation_invalid' using errcode = '42501';
  end if;

  insert into public.profiles (user_id) values (new.id);

  return new;
end;
$$;
