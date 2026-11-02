-- KICKPACK V5 : à exécuter UNE SEULE FOIS sur la base EXISTANTE.
-- Ne supprime ni profils, ni comptes, ni rôles Owner.
ALTER TABLE public.kp_profiles ADD COLUMN IF NOT EXISTS pseudo_changed_at timestamptz;

CREATE OR REPLACE FUNCTION public.kp_change_pseudo(new_pseudo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_changed timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  new_pseudo := lower(trim(new_pseudo));
  IF new_pseudo IS NULL OR new_pseudo !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION 'Pseudo invalide (3 à 24 caractères : a-z, 0-9, _)';
  END IF;
  SELECT pseudo_changed_at INTO old_changed FROM public.kp_profiles WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF old_changed IS NOT NULL AND old_changed + interval '14 days' > now() THEN
    RAISE EXCEPTION 'Changement autorisé tous les 14 jours';
  END IF;
  IF EXISTS (SELECT 1 FROM public.kp_profiles WHERE lower(pseudo) = new_pseudo AND user_id <> auth.uid()) THEN
    RAISE EXCEPTION 'Pseudo déjà utilisé';
  END IF;
  UPDATE public.kp_profiles SET pseudo = new_pseudo, pseudo_changed_at = now() WHERE user_id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.kp_change_pseudo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kp_change_pseudo(text) TO authenticated;
