-- V36 : empêcher côté PostgreSQL l'ajout de cartes à une collection sanctionnée.
-- Prérequis : migrations V13 et V21. Aucun accès direct à kp_collections n'est accordé.
-- Une sanction 'packs' ou 'all' empêche tout AJOUT de carte, même si le navigateur est modifié.
-- Les retraits restent possibles (ex. échange annulé / nettoyage administratif).

create or replace function public.kp_v36_guard_banned_card_additions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare old_cards jsonb; added boolean;
begin
 if not public.kp_is_restricted(new.user_id,'packs') then return new; end if;
 old_cards := case when tg_op='INSERT' then '[]'::jsonb else old.cards end;
 -- Comparaison par identifiant de carte ; interdit aussi de remplacer un identifiant existant.
 select exists (
  select 1 from jsonb_array_elements(new.cards) as n(card)
  where not exists (
   select 1 from jsonb_array_elements(old_cards) as o(card)
   where o.card->>'id'=n.card->>'id' and o.card=n.card
  )
 ) into added;
 if added then
  raise exception 'PACKS_BANNED: ajout de cartes interdit pour ce compte (sanction active)';
 end if;
 return new;
end $$;

revoke all on function public.kp_v36_guard_banned_card_additions() from public,anon,authenticated;
drop trigger if exists kp_v36_guard_banned_cards on public.kp_collections;
create trigger kp_v36_guard_banned_cards
before insert or update of cards on public.kp_collections
for each row execute function public.kp_v36_guard_banned_card_additions();

-- Note : la génération des tirages, le débit de gemmes et les boosters gratuits
-- restent actuellement dans le navigateur. Pour les rendre totalement inviolables,
-- il faudra déplacer toute l'économie et le tirage dans une RPC transactionnelle.
