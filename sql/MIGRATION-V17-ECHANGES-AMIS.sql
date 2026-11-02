-- V17 : échanges 1 carte contre 1 carte, exclusivement entre amis acceptés.
-- Les cartes offertes sont placées en séquestre jusqu'à acceptation/refus/annulation.
create table if not exists public.kp_trades (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references auth.users(id) on delete cascade,
 receiver uuid not null references auth.users(id) on delete cascade,
 offered jsonb not null,
 requested_pid text not null,
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),
 resolved_at timestamptz,
 check(sender<>receiver)
);
alter table public.kp_trades enable row level security;
revoke all on public.kp_trades from public,anon,authenticated;

create or replace function public.kp_trade_friend_collection(target_pseudo text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare other_id uuid; cards jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select user_id into other_id from public.kp_profiles where lower(pseudo)=lower(trim(target_pseudo));
 if other_id is null or not exists(select 1 from public.kp_friendships where status='accepted' and ((requester=auth.uid() and recipient=other_id) or (recipient=auth.uid() and requester=other_id))) then raise exception 'Échange réservé aux amis'; end if;
 select c.cards into cards from public.kp_collections c where user_id=other_id;
 return coalesce(cards,'[]'::jsonb);
end $$;

create or replace function public.kp_trade_list()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'sender',ps.pseudo,'receiver',pr.pseudo,'incoming',t.receiver=auth.uid(),'offered_pid',t.offered->>'pid','requested_pid',t.requested_pid,'status',t.status,'created_at',t.created_at) order by t.created_at desc),'[]'::jsonb)
 from public.kp_trades t
 join public.kp_profiles ps on ps.user_id=t.sender
 join public.kp_profiles pr on pr.user_id=t.receiver
 where auth.uid() is not null and (t.sender=auth.uid() or t.receiver=auth.uid()) and (t.status='pending' or t.created_at>now()-interval '14 days');
$$;

create or replace function public.kp_trade_action(p_action text, p_trade_id uuid default null, p_friend text default null, p_card_id text default null, p_wanted_pid text default null)
returns text language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); other_id uuid; a public.kp_collections%rowtype; b public.kp_collections%rowtype; t public.kp_trades%rowtype; card jsonb; other_card jsonb; updated_cards jsonb; removed boolean;
begin
 if me is null then raise exception 'Connexion requise'; end if;
 if p_action='offer' then
  select user_id into other_id from public.kp_profiles where lower(pseudo)=lower(trim(p_friend));
  if other_id is null or other_id=me or not exists(select 1 from public.kp_friendships where status='accepted' and ((requester=me and recipient=other_id) or (requester=other_id and recipient=me))) then raise exception 'Échange réservé aux amis'; end if;
  if p_card_id is null or p_wanted_pid is null or p_wanted_pid !~ '^[a-z0-9-]{1,120}$' then raise exception 'Cartes invalides'; end if;
  insert into public.kp_collections(user_id) values(me),(other_id) on conflict do nothing;
  -- Verrouiller dans l'ordre des UUID pour éviter les interblocages.
  perform 1 from public.kp_collections where user_id in (me,other_id) order by user_id for update;
  select * into a from public.kp_collections where user_id=me;
  select * into b from public.kp_collections where user_id=other_id;
  select x.elem into card from jsonb_array_elements(a.cards) x(elem) where x.elem->>'id'=p_card_id limit 1;
  if card is null then raise exception 'Carte proposée introuvable'; end if;
  if not exists(select 1 from jsonb_array_elements(b.cards) x where x->>'pid'=p_wanted_pid) then raise exception 'Ton ami ne possède pas cette carte'; end if;
  select coalesce(jsonb_agg(x.elem order by x.ord),'[]'::jsonb) into updated_cards from jsonb_array_elements(a.cards) with ordinality x(elem,ord) where x.elem->>'id'<>p_card_id;
  update public.kp_collections set cards=updated_cards,revision=revision+1,updated_at=now() where user_id=me;
  insert into public.kp_trades(sender,receiver,offered,requested_pid) values(me,other_id,card,p_wanted_pid);
  return 'Proposition envoyée : ta carte est réservée';
 end if;
 if p_trade_id is null then raise exception 'Échange manquant'; end if;
 select * into t from public.kp_trades where id=p_trade_id for update;
 if t.id is null or t.status<>'pending' then raise exception 'Échange déjà terminé ou introuvable'; end if;
 if p_action='accept' then
  if t.receiver<>me then raise exception 'Seul le destinataire peut accepter'; end if;
  if not exists(select 1 from public.kp_friendships where status='accepted' and ((requester=t.sender and recipient=t.receiver) or (requester=t.receiver and recipient=t.sender))) then raise exception 'Vous devez encore être amis'; end if;
  perform 1 from public.kp_collections where user_id in (t.sender,t.receiver) order by user_id for update;
  select * into a from public.kp_collections where user_id=t.sender;
  select * into b from public.kp_collections where user_id=t.receiver;
  select x.elem into other_card from jsonb_array_elements(b.cards) x(elem) where x.elem->>'pid'=t.requested_pid order by (x.elem->>'at') nulls last limit 1;
  if other_card is null then raise exception 'Tu ne possèdes plus la carte demandée'; end if;
  select coalesce(jsonb_agg(x.elem order by x.ord),'[]'::jsonb) into updated_cards from jsonb_array_elements(b.cards) with ordinality x(elem,ord) where x.elem->>'id'<>other_card->>'id';
  -- Remettre des IDs uniques pour éviter une collision chez le destinataire.
  update public.kp_collections set cards=a.cards||jsonb_build_array(jsonb_set(other_card,'{id}',to_jsonb('trade-'||gen_random_uuid()::text))),revision=revision+1,updated_at=now() where user_id=t.sender;
  update public.kp_collections set cards=updated_cards||jsonb_build_array(jsonb_set(t.offered,'{id}',to_jsonb('trade-'||gen_random_uuid()::text))),revision=revision+1,updated_at=now() where user_id=t.receiver;
  update public.kp_trades set status='accepted',resolved_at=now() where id=t.id;
  return 'Échange effectué';
 elsif p_action in ('decline','cancel') then
  if p_action='decline' and t.receiver<>me or p_action='cancel' and t.sender<>me then raise exception 'Action non autorisée'; end if;
  select * into a from public.kp_collections where user_id=t.sender for update;
  update public.kp_collections set cards=a.cards||jsonb_build_array(t.offered),revision=revision+1,updated_at=now() where user_id=t.sender;
  update public.kp_trades set status=case when p_action='decline' then 'declined' else 'cancelled' end,resolved_at=now() where id=t.id;
  return 'Carte restituée';
 end if;
 raise exception 'Action inconnue';
end $$;
revoke all on function public.kp_trade_friend_collection(text) from public,anon;
revoke all on function public.kp_trade_list() from public,anon;
revoke all on function public.kp_trade_action(text,uuid,text,text,text) from public,anon;
grant execute on function public.kp_trade_friend_collection(text) to authenticated;
grant execute on function public.kp_trade_list() to authenticated;
grant execute on function public.kp_trade_action(text,uuid,text,text,text) to authenticated;
