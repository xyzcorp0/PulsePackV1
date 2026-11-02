-- KICKPACK V2 : exécuter dans un NOUVEAU projet Supabase (SQL Editor).
create table public.kp_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 pseudo text not null default 'Joueur' check (char_length(pseudo) between 2 and 30),
 role text not null default 'member' check (role in ('member','admin','owner')),
 created_at timestamptz not null default now()
);
create table public.kp_site_settings (
 id integer primary key default 1 check(id=1),
 theme text not null default 'normal' check(theme in ('normal','halloween','christmas','newyear','birthday','easter')),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
insert into public.kp_site_settings(id) values (1);
create or replace function public.kp_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.kp_profiles(user_id,pseudo) values(new.id, left(coalesce(nullif(new.raw_user_meta_data->>'pseudo',''), 'Joueur'),30));
 return new;
end $$;
create trigger kp_auth_created after insert on auth.users for each row execute function public.kp_new_user();
-- RLS: rôles non modifiables depuis le navigateur
alter table public.kp_profiles enable row level security;
alter table public.kp_site_settings enable row level security;
create or replace function public.kp_is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.kp_profiles where user_id=(select auth.uid()) and role='owner')
$$;
revoke all on function public.kp_is_owner() from public,anon;
grant execute on function public.kp_is_owner() to authenticated;
create policy kp_profiles_read on public.kp_profiles for select to authenticated using (user_id=(select auth.uid()) or (select public.kp_is_owner()));
create policy kp_theme_read on public.kp_site_settings for select to anon,authenticated using (true);
-- Les changements sont uniquement possibles par fonctions RPC contrôlées.
create or replace function public.kp_my_role() returns text language sql stable security definer set search_path='' as $$
 select coalesce((select role from public.kp_profiles where user_id=(select auth.uid())), 'guest')
$$;
revoke all on function public.kp_my_role() from public,anon;
grant execute on function public.kp_my_role() to authenticated;
create or replace function public.kp_set_theme(new_theme text) returns void language plpgsql security definer set search_path='' as $$
begin
 if (select public.kp_my_role()) not in ('admin','owner') then raise exception 'Accès administrateur requis'; end if;
 if new_theme not in ('normal','halloween','christmas','newyear','birthday','easter') or new_theme is null then raise exception 'Thème invalide'; end if;
 update public.kp_site_settings set theme=new_theme,updated_at=now(),updated_by=auth.uid() where id=1;
end $$;
revoke all on function public.kp_set_theme(text) from public,anon;
grant execute on function public.kp_set_theme(text) to authenticated;
create or replace function public.kp_manage_role(target uuid, new_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if (select public.kp_my_role()) <> 'owner' then raise exception 'Réservé au propriétaire'; end if;
 if new_role not in ('member','admin') or new_role is null then raise exception 'Rôle invalide'; end if;
 if not exists(select 1 from public.kp_profiles where user_id=target and role<>'owner') then raise exception 'Utilisateur introuvable ou propriétaire protégé'; end if;
 update public.kp_profiles set role=new_role where user_id=target;
end $$;
revoke all on function public.kp_manage_role(uuid,text) from public,anon;
grant execute on function public.kp_manage_role(uuid,text) to authenticated;
-- Après avoir créé VOTRE compte via l'interface, définir le premier owner
-- en exécutant MANUELLEMENT ceci dans SQL Editor (remplacer l'email) :
-- update public.kp_profiles set role='owner' where user_id=(select id from auth.users where email='VOTRE_EMAIL');
-- Ne jamais exposer la clé service_role côté navigateur.
