-- KICKPACK V21 : sanctions et restrictions gérées côté serveur.
create table if not exists public.kp_sanctions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 scope text not null check(scope in ('all','trades','transfers','packs','market')),
 reason text not null check(length(trim(reason)) between 1 and 500),
 staff_id uuid references auth.users(id) on delete set null,
 staff_pseudo text not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz,
 revoked_at timestamptz,
 revoked_by uuid references auth.users(id) on delete set null
);
create index if not exists kp_sanctions_active_idx on public.kp_sanctions(user_id,scope) where revoked_at is null;
alter table public.kp_sanctions enable row level security;
revoke all on public.kp_sanctions from public,anon,authenticated;

create or replace function public.kp_is_restricted(p_user uuid,p_scope text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.kp_sanctions s where s.user_id=p_user and s.revoked_at is null and (s.expires_at is null or s.expires_at>now()) and s.scope in ('all',p_scope));
$$;
revoke all on function public.kp_is_restricted(uuid,text) from public,anon;
grant execute on function public.kp_is_restricted(uuid,text) to authenticated;

create or replace function public.kp_my_sanctions()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('scope',scope,'reason',reason,'staff_pseudo',staff_pseudo,'expires_at',expires_at) order by created_at desc),'[]'::jsonb)
 from public.kp_sanctions where user_id=auth.uid() and revoked_at is null and (expires_at is null or expires_at>now());
$$;
revoke all on function public.kp_my_sanctions() from public,anon;
grant execute on function public.kp_my_sanctions() to authenticated;

create or replace function public.kp_owner_moderate(p_pseudo text,p_action text,p_scope text default 'all',p_reason text default '',p_hours integer default null)
returns text language plpgsql security definer set search_path='' as $$
declare target_id uuid; staff_name text; n integer;
begin
 if public.kp_my_role()<>'owner' then raise exception 'Owner uniquement'; end if;
 select user_id into target_id from public.kp_profiles where lower(pseudo)=lower(trim(p_pseudo));
 if target_id is null then raise exception 'Compte introuvable'; end if;
 if target_id=auth.uid() or exists(select 1 from public.kp_profiles where user_id=target_id and role='owner') then raise exception 'Le Owner est protégé'; end if;
 if p_scope not in ('all','trades','transfers','packs','market') then raise exception 'Restriction inconnue'; end if;
 if p_action='inspect' then
  select count(*) into n from public.kp_sanctions where user_id=target_id and revoked_at is null and (expires_at is null or expires_at>now());
  return n::text||' sanction(s) active(s)';
 elsif p_action='ban' then
  if length(trim(p_reason)) not between 1 and 500 then raise exception 'Motif obligatoire (500 caractères maximum)'; end if;
  if p_hours is not null and (p_hours<1 or p_hours>87600) then raise exception 'Durée invalide'; end if;
  select pseudo into staff_name from public.kp_profiles where user_id=auth.uid();
  insert into public.kp_sanctions(user_id,scope,reason,staff_id,staff_pseudo,expires_at)
  values(target_id,p_scope,trim(p_reason),auth.uid(),staff_name,case when p_hours is null then null else now()+make_interval(hours=>p_hours) end);
  return 'Sanction enregistrée';
 elsif p_action='unban' then
  update public.kp_sanctions set revoked_at=now(),revoked_by=auth.uid() where user_id=target_id and scope=p_scope and revoked_at is null;
  get diagnostics n=row_count;return n::text||' sanction(s) levée(s)';
 end if;
 raise exception 'Action inconnue';
end $$;
revoke all on function public.kp_owner_moderate(text,text,text,text,integer) from public,anon;
grant execute on function public.kp_owner_moderate(text,text,text,text,integer) to authenticated;


-- Échanges : vérification serveur lors de la proposition et de l’acceptation.
create or replace function public.kp_trade_action(p_action text, p_trade_id uuid default null, p_friend text default null, p_card_id text default null, p_wanted_pid text default null)
returns text language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); other_id uuid; a public.kp_collections%rowtype; b public.kp_collections%rowtype; t public.kp_trades%rowtype; card jsonb; other_card jsonb; updated_cards jsonb; removed boolean;
begin
 if me is null then raise exception 'Connexion requise'; end if;
 if public.kp_is_restricted(me,'trades') then raise exception 'Échanges interdits : sanction active'; end if;
 if p_action='offer' then
  select user_id into other_id from public.kp_profiles where lower(pseudo)=lower(trim(p_friend));
  if other_id is not null and public.kp_is_restricted(other_id,'trades') then raise exception 'Ton ami ne peut pas échanger : sanction active'; end if;
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
  if public.kp_is_restricted(t.sender,'trades') then raise exception 'Expéditeur sanctionné'; end if;
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

