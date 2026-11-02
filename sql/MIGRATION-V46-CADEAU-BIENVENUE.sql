-- KICKPACK V46 — cadeau unique à la création du compte.
-- 10 boosters gratuits et 1000 gemmes bleues. Non rétroactif.
-- Dépend des migrations V14 et V15 (table kp_rewards, colonne gems).
-- Le trigger est côté Supabase : une reconnexion ne redonne rien.
create or replace function public.kp_v46_welcome_reward()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.kp_rewards (user_id, gems, pack_id, pack_count)
  values (new.user_id, 1000, 'free', 10);
  return new;
end;
$$;
drop trigger if exists kp_v46_welcome_reward_trigger on public.kp_profiles;
create trigger kp_v46_welcome_reward_trigger
  after insert on public.kp_profiles
  for each row execute function public.kp_v46_welcome_reward();
revoke all on function public.kp_v46_welcome_reward() from public, anon, authenticated;
