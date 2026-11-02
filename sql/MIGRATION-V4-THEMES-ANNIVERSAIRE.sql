-- KICKPACK V4 : MIGRATION UNIQUEMENT (ne PAS réexécuter schema.sql).
-- Conserve tous les comptes, rôles et le thème existants.
ALTER TABLE public.kp_site_settings ADD COLUMN IF NOT EXISTS birthday_name text NOT NULL DEFAULT '';
ALTER TABLE public.kp_site_settings ADD COLUMN IF NOT EXISTS birthday_message text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.kp_set_theme(new_theme text, bday_name text DEFAULT NULL, bday_message text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF (SELECT public.kp_my_role()) NOT IN ('admin','owner') THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
 IF new_theme IS NULL OR new_theme NOT IN ('normal','halloween','christmas','newyear','birthday','easter') THEN RAISE EXCEPTION 'Thème invalide'; END IF;
 IF char_length(coalesce(bday_name,''))>40 OR char_length(coalesce(bday_message,''))>140 THEN RAISE EXCEPTION 'Message trop long'; END IF;
 UPDATE public.kp_site_settings SET theme=new_theme,
 birthday_name=CASE WHEN new_theme='birthday' THEN coalesce(bday_name,'') ELSE birthday_name END,
 birthday_message=CASE WHEN new_theme='birthday' THEN coalesce(bday_message,'') ELSE birthday_message END,
 updated_at=now(),updated_by=auth.uid() WHERE id=1;
END $$;
REVOKE ALL ON FUNCTION public.kp_set_theme(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kp_set_theme(text,text,text) TO authenticated;
-- Supprimer l'ancienne surcharge (1 paramètre) : elle n'est plus nécessaire.
DROP FUNCTION IF EXISTS public.kp_set_theme(text);
