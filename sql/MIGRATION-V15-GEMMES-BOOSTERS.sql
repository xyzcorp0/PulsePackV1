-- KICKPACK V15 : exécuter APRÈS V14. Remplace les pièces cadeaux par les gemmes.
-- Les boosters gratuits remplissent le compteur existant (plafond 10).
alter table public.kp_rewards add column if not exists gems bigint not null default 0 check(gems>=0);
create or replace function public.kp_admin_reward(target_pseudo text,gem_amount bigint,pack_id text,pack_count integer)
returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if (select public.kp_my_role()) not in ('admin','owner') then raise exception 'Accès refusé'; end if;
 if gem_amount is null or gem_amount<0 or pack_count is null or pack_count<0 or pack_count>10 or (gem_amount=0 and pack_count=0) then raise exception 'Quantité invalide'; end if;
 if pack_id not in ('free','monde','daily','l1','pl','ll','sa','bl','att','gar','fr','br','legendes','elite') then raise exception 'Booster inconnu'; end if;
 select user_id into target from public.kp_profiles where lower(pseudo)=lower(trim(target_pseudo));
 if target is null then raise exception 'Pseudo introuvable'; end if;
 insert into public.kp_rewards(user_id,gems,pack_id,pack_count) values(target,gem_amount,pack_id,pack_count);
end $$;
create or replace function public.kp_claim_rewards()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 with claimed as (update public.kp_rewards set claimed_at=now() where user_id=auth.uid() and claimed_at is null returning gems,pack_id,pack_count)
 select jsonb_build_object('gems',coalesce(sum(gems),0),'packs',coalesce(jsonb_agg(jsonb_build_object('id',pack_id,'count',pack_count)),'[]'::jsonb)) into result from claimed;
 return coalesce(result,'{"gems":0,"packs":[]}'::jsonb);
end $$;
revoke all on function public.kp_admin_reward(text,bigint,text,integer) from public,anon;
grant execute on function public.kp_admin_reward(text,bigint,text,integer) to authenticated;
