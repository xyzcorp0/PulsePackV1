-- Exécuter après la migration V13. Ne pas utiliser de service_role dans le navigateur.
create table if not exists public.kp_rewards (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 coins bigint not null default 0 check(coins>=0),
 pack_id text not null default 'monde',
 pack_count integer not null default 0 check(pack_count between 0 and 10),
 created_at timestamptz not null default now(),
 claimed_at timestamptz
);
alter table public.kp_rewards enable row level security;
revoke all on public.kp_rewards from public,anon,authenticated;
create or replace function public.kp_admin_reward(target_pseudo text,coin_amount bigint,pack_id text,pack_count integer)
returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if (select public.kp_my_role()) not in ('admin','owner') then raise exception 'Accès refusé'; end if;
 if coin_amount is null or coin_amount<0 or pack_count is null or pack_count<0 or pack_count>10 or (coin_amount=0 and pack_count=0) then raise exception 'Quantité invalide'; end if;
 if pack_id not in ('monde','daily','l1','pl','ll','sa','bl','att','gar','fr','br','legendes','elite') then raise exception 'Booster inconnu'; end if;
 select user_id into target from public.kp_profiles where lower(pseudo)=lower(trim(target_pseudo));
 if target is null then raise exception 'Pseudo introuvable'; end if;
 insert into public.kp_rewards(user_id,coins,pack_id,pack_count) values(target,coin_amount,pack_id,pack_count);
end $$;
-- Une réclamation atomique : une récompense ne peut être réclamée qu'une fois.
create or replace function public.kp_claim_rewards()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 with claimed as (update public.kp_rewards set claimed_at=now() where user_id=auth.uid() and claimed_at is null returning coins,pack_id,pack_count)
 select jsonb_build_object('coins',coalesce(sum(coins),0),'packs',coalesce(jsonb_agg(jsonb_build_object('id',pack_id,'count',pack_count)),'[]'::jsonb)) into result from claimed;
 return coalesce(result,'{"coins":0,"packs":[]}'::jsonb);
end $$;
create table if not exists public.kp_friendships (
 id bigint generated always as identity primary key,
 requester uuid not null references auth.users(id) on delete cascade,
 recipient uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 check(requester<>recipient),unique(requester,recipient)
);
alter table public.kp_friendships enable row level security;
revoke all on public.kp_friendships from public,anon,authenticated;
create or replace function public.kp_friend_action(target_pseudo text, action text)
returns text language plpgsql security definer set search_path='' as $$
declare target uuid; current_id uuid:=auth.uid(); f public.kp_friendships%rowtype;
begin
 if current_id is null then raise exception 'Connexion requise'; end if;
 select user_id into target from public.kp_profiles where lower(pseudo)=lower(trim(target_pseudo));
 if target is null or target=current_id then raise exception 'Pseudo invalide'; end if;
 select * into f from public.kp_friendships where (requester=current_id and recipient=target) or (requester=target and recipient=current_id) order by id desc limit 1;
 if action='request' then
  if f.id is not null and f.status in ('pending','accepted') then raise exception 'Demande déjà existante'; end if;
  if f.id is not null then delete from public.kp_friendships where id=f.id; end if;
  insert into public.kp_friendships(requester,recipient) values(current_id,target);return 'Demande envoyée';
 elsif action='accept' and f.recipient=current_id and f.status='pending' then
  update public.kp_friendships set status='accepted' where id=f.id;return 'Ami ajouté';
 elsif action='decline' and f.recipient=current_id and f.status='pending' then
  update public.kp_friendships set status='declined' where id=f.id;return 'Demande refusée';
 elsif action='remove' and f.id is not null then
  delete from public.kp_friendships where id=f.id;return 'Relation supprimée';
 end if;
 raise exception 'Action non autorisée';
end $$;
create or replace function public.kp_friends_list()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('pseudo',p.pseudo,'status',f.status,'incoming',f.recipient=auth.uid())),'[]'::jsonb)
 from public.kp_friendships f join public.kp_profiles p on p.user_id=case when f.requester=auth.uid() then f.recipient else f.requester end
 where f.requester=auth.uid() or f.recipient=auth.uid()
$$;
revoke all on function public.kp_admin_reward(text,bigint,text,integer) from public,anon;
revoke all on function public.kp_claim_rewards() from public,anon;
revoke all on function public.kp_friend_action(text,text) from public,anon;
revoke all on function public.kp_friends_list() from public,anon;
grant execute on function public.kp_admin_reward(text,bigint,text,integer) to authenticated;
grant execute on function public.kp_claim_rewards() to authenticated;
grant execute on function public.kp_friend_action(text,text) to authenticated;
grant execute on function public.kp_friends_list() to authenticated;
