-- v0.12.1 : import Strong et Hevy.
-- Une série faite avant le lancement d'une séance commune n'y part pas. Sans cela,
-- importer un historique pendant une séance commune l'aurait affiché aux participants.
-- Cinq minutes de marge pour l'horloge du téléphone. Remplace la fonction de
-- 20261118000000_seances_communes.sql (non destructif : rien n'est supprimé).

create or replace function public.share_set_with_group() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.completed_at is null or new.is_warmup or (tg_op = 'UPDATE' and old.completed_at is not null) then
    return new;
  end if;
  begin
    insert into public.group_events (session_id, user_id, set_id, exercise_name, weight_kg, reps, duration_seconds)
    select p.session_id, new.user_id, new.id, e.name, new.weight_kg, new.reps, new.duration_seconds
      from public.group_participants p
      join public.group_sessions s on s.id = p.session_id
      join public.exercises e on e.id = new.exercise_id
     where p.user_id = new.user_id
       and p.joined_at is not null
       and s.ended_at is null
       and s.created_at > now() - interval '6 hours'
       and new.completed_at >= s.created_at - interval '5 minutes'
    on conflict (session_id, set_id) do nothing;
  exception when others then
    null;
  end;
  return new;
end;
$$;
