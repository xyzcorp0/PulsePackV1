-- KICKPACK V13 : collections synchronisées et administration sécurisée.
-- À exécuter UNE FOIS dans Supabase SQL Editor, sans supprimer les anciennes tables.
create table if not exists public.kp_collections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 cards jsonb not null default '[]'::jsonb,
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 constraint kp_cards_array check (jsonb_typeof(cards) = 'array')
);
alter table public.kp_collections enable row level security;
-- Aucune politique directe d'écriture : toutes les modifications passent par des RPC.
revoke all on public.kp_collections from anon, authenticated;

create or replace function public.kp_collection_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.kp_collections%rowtype;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 insert into public.kp_collections(user_id) values(auth.uid()) on conflict do nothing;
 select * into c from public.kp_collections where user_id=auth.uid();
 return jsonb_build_object('cards',c.cards,'revision',c.revision);
end $$;

create or replace function public.kp_collection_save(new_cards jsonb, expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.kp_collections%rowtype;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if jsonb_typeof(new_cards) <> 'array' or jsonb_array_length(new_cards)>20000 then raise exception 'Collection invalide'; end if;
 if exists (select 1 from jsonb_array_elements(new_cards) x where
  jsonb_typeof(x)<>'object' or length(coalesce(x->>'pid',''))>120 or
  coalesce(x->>'pid','') !~ '^[a-z0-9-]+$') then raise exception 'Cartes invalides'; end if;
 insert into public.kp_collections(user_id) values(auth.uid()) on conflict do nothing;
 update public.kp_collections set cards=new_cards,revision=revision+1,updated_at=now()
 where user_id=auth.uid() and revision=expected_revision returning * into c;
 if not found then raise exception 'REVISION_CONFLICT'; end if;
 return jsonb_build_object('cards',c.cards,'revision',c.revision);
end $$;

create or replace function public.kp_admin_collection(target_pseudo text, operation text, player_id text default null, quantity integer default 1, all_ids jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target_id uuid; c public.kp_collections%rowtype; a jsonb; i integer; n integer; removed integer:=0; pid text;
begin
 if (select public.kp_my_role()) not in ('admin','owner') then raise exception 'Accès administrateur requis'; end if;
 select user_id into target_id from public.kp_profiles where lower(pseudo)=lower(trim(target_pseudo));
 if target_id is null then raise exception 'Pseudo introuvable'; end if;
 if operation not in ('inspect','unlock','clear','give','remove','remove_all') then raise exception 'Opération inconnue'; end if;
 if operation in ('give','remove','remove_all') and (player_id is null or player_id !~ '^[a-z0-9-]{1,120}$') then raise exception 'Joueur invalide'; end if;
 if operation='give' and (quantity<1 or quantity>100) then raise exception 'Quantité invalide (1 à 100)'; end if;
 if operation='remove' and (quantity<1 or quantity>20000) then raise exception 'Quantité invalide'; end if;
 if operation='unlock' and (jsonb_typeof(all_ids)<>'array' or jsonb_array_length(all_ids)>1000 or jsonb_array_length(all_ids)=0) then raise exception 'Liste de joueurs invalide'; end if;
 insert into public.kp_collections(user_id) values(target_id) on conflict do nothing;
 select * into c from public.kp_collections where user_id=target_id for update;
 a:=c.cards;
 if operation='clear' then a:='[]'::jsonb;
 elsif operation='unlock' then
  for pid in select distinct value from jsonb_array_elements_text(all_ids) loop
   if pid !~ '^[a-z0-9-]{1,120}$' then raise exception 'Identifiant de joueur invalide'; end if;
   if not exists (select 1 from jsonb_array_elements(a) x where x->>'pid'=pid) then
    a:=a||jsonb_build_array(jsonb_build_object('id','admin-'||gen_random_uuid()::text,'pid',pid,'serial',1,'at',extract(epoch from now())*1000));
   end if;
  end loop;
 elsif operation='give' then
  for i in 1..quantity loop
   a:=a||jsonb_build_array(jsonb_build_object('id','admin-'||gen_random_uuid()::text,'pid',player_id,'serial',1,'at',extract(epoch from now())*1000));
  end loop;
 elsif operation in ('remove','remove_all') then
  n:=case when operation='remove_all' then 20000 else quantity end;
  select coalesce(jsonb_agg(x.elem order by x.ord),'[]'::jsonb) into a
  from jsonb_array_elements(a) with ordinality as x(elem,ord)
  where not (x.elem->>'pid'=player_id and (select count(*) from jsonb_array_elements(c.cards) with ordinality as y(elem,ord) where y.elem->>'pid'=player_id and y.ord<=x.ord)<=n);
 end if;
 if operation<>'inspect' then
  update public.kp_collections set cards=a,revision=revision+1,updated_at=now() where user_id=target_id returning * into c;
 end if;
 return jsonb_build_object('pseudo',target_pseudo,'cards',a,'count',jsonb_array_length(a),'revision',c.revision);
end $$;
revoke all on function public.kp_collection_get() from public,anon;
revoke all on function public.kp_collection_save(jsonb,bigint) from public,anon;
revoke all on function public.kp_admin_collection(text,text,text,integer,jsonb) from public,anon;
grant execute on function public.kp_collection_get() to authenticated;
grant execute on function public.kp_collection_save(jsonb,bigint) to authenticated;
grant execute on function public.kp_admin_collection(text,text,text,integer,jsonb) to authenticated;
