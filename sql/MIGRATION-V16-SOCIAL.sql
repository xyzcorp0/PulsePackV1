-- Classement social : uniquement les vrais comptes Supabase, nombre de cartes synchronisées.
-- Pas de fausses valeurs ni de comptes de démonstration.
create or replace function public.kp_social_ranking()
returns table(pseudo text,card_count bigint,is_me boolean)
language sql security definer set search_path = '' as $$
 select p.pseudo::text, coalesce(jsonb_array_length(c.cards),0)::bigint,
        (p.user_id=auth.uid())
 from public.kp_profiles p
 left join public.kp_collections c on c.user_id=p.user_id
 where auth.uid() is not null
 order by coalesce(jsonb_array_length(c.cards),0) desc, lower(p.pseudo)
 limit 100;
$$;
revoke all on function public.kp_social_ranking() from public,anon;
grant execute on function public.kp_social_ranking() to authenticated;
