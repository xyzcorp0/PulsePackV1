-- KICKPACK V23 : suppression définitive depuis le panneau Owner, sans Edge Function.
-- Exécuter UNE FOIS dans Supabase SQL Editor après la migration V21.
-- Fonction SECURITY DEFINER : réservée au Owner, aucun privilège direct sur auth.users accordé.
create or replace function public.kp_owner_delete_account(p_pseudo text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  target_role text;
  target_name text;
begin
  if auth.uid() is null or public.kp_my_role() <> 'owner' then
    raise exception 'Accès réservé au Owner';
  end if;
  if p_pseudo is null or length(trim(p_pseudo)) < 2 then
    raise exception 'Pseudo invalide';
  end if;
  select user_id, role, pseudo into target_id, target_role, target_name
  from public.kp_profiles
  where lower(pseudo) = lower(trim(p_pseudo));
  if target_id is null then raise exception 'Compte introuvable'; end if;
  if target_id = auth.uid() or target_role = 'owner' then
    raise exception 'Impossible de supprimer le compte Owner';
  end if;
  -- Les références non-cascadées doivent être libérées avant la suppression.
  update public.kp_site_settings set updated_by = null where updated_by = target_id;
  -- Les autres données KICKPACK liées à auth.users sont supprimées par CASCADE
  -- ou conservées avec staff_id / revoked_by à NULL (ON DELETE SET NULL).
  delete from auth.users where id = target_id;
  if not found then raise exception 'Utilisateur Auth introuvable'; end if;
  return 'Compte ' || target_name || ' supprimé définitivement (connexion et données associées).';
end;
$$;
revoke all on function public.kp_owner_delete_account(text) from public, anon;
grant execute on function public.kp_owner_delete_account(text) to authenticated;
