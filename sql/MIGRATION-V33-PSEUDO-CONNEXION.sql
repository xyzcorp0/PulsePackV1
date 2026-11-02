-- KICKPACK V33 : le pseudo public courant est aussi le pseudo de connexion.
-- A exécuter après V5 et les migrations déjà installées.
-- Ne modifie PAS auth.users.email : Supabase conserve son identifiant interne stable.
-- Aucun compte, carte ou mot de passe n'est recréé ou perdu.

-- Empêcher les doublons, y compris lors de modifications simultanées.
-- Si des doublons préexistants existent, les corriger avant de relancer ce SQL.
CREATE UNIQUE INDEX IF NOT EXISTS kp_profiles_pseudo_ci_unique
  ON public.kp_profiles (lower(pseudo));

-- Le client non connecté peut résoudre le pseudo ACTUEL vers l'email technique
-- utilisé en interne par Supabase Auth. Ne retourne que des emails techniques
-- @users.kickpack.app, jamais des emails personnels.
CREATE OR REPLACE FUNCTION public.kp_login_email(p_pseudo text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_email text;
BEGIN
  IF p_pseudo IS NULL OR lower(trim(p_pseudo)) !~ '^[a-z0-9_]{3,24}$' THEN
    RETURN NULL;
  END IF;
  SELECT u.email INTO v_email
  FROM public.kp_profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE lower(p.pseudo) = lower(trim(p_pseudo))
  LIMIT 1;
  IF v_email IS NULL OR v_email NOT LIKE '%@users.kickpack.app' THEN
    RETURN NULL;
  END IF;
  RETURN v_email;
END $$;
REVOKE ALL ON FUNCTION public.kp_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kp_login_email(text) TO anon, authenticated;

-- Note de sécurité : la recherche de pseudo est publique, comme le formulaire
-- de connexion. Conserver les protections anti-bruteforce de Supabase Auth.
