-- KICKPACK V38 : contrôle serveur au moment de CHAQUE action sensible.
-- Prérequis : migrations V21 et V36 déjà exécutées.
-- La vérification retourne false si une sanction est active. Le navigateur refuse
-- l'action si le réseau échoue, si la session est absente ou si le RPC échoue.
create or replace function public.kp_v38_action_allowed(p_scope text)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then return false; end if;
 if p_scope not in ('packs','trades','transfers','market') then return false; end if;
 return not public.kp_is_restricted(auth.uid(),p_scope);
end $$;
revoke all on function public.kp_v38_action_allowed(text) from public,anon;
grant execute on function public.kp_v38_action_allowed(text) to authenticated;
