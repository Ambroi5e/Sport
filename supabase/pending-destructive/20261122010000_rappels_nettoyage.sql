-- Migration destructive (supprime des lignes) : EN ATTENTE de la validation d'Ambroise.
--
-- Pourquoi : quand un appareil est désabonné (déconnexion, app désinstallée,
-- permission retirée), le service de notifications répond « périmé » (404 ou 410)
-- à l'Edge Function `rappels`, qui renvoie ces adresses dans sa réponse. Sans ce
-- nettoyage, elles restent dans `push_subscriptions` et sont réessayées à chaque rappel.
--
-- Effet : toutes les 10 minutes, les adresses déclarées périmées dans le dernier quart
-- d'heure sont retirées. Un appareil encore abonné n'est jamais touché ; un appareil
-- retiré à tort se réabonne en rouvrant Réglages > Rappels.

create function private.prune_push_subscriptions()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with gone as (
    select distinct jsonb_array_elements_text(r.content::jsonb -> 'gone') as endpoint
      from net._http_response r
     where r.created > now() - interval '15 minutes'
       and r.status_code = 200
       and left(r.content, 22) = '{"fonte_rappels":true,'
  )
  delete from public.push_subscriptions s using gone g where s.endpoint = g.endpoint;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select cron.schedule('fonte-rappels-nettoyage', '3-59/10 * * * *', 'select private.prune_push_subscriptions()');
