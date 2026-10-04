-- Run in SQL Editor after creating ONE confirmed user in Authentication > Users.
-- Never adds accounts or exports passwords. Refuses ambiguous user selection.
DO $$
DECLARE owner_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.dar_admin_profiles WHERE role='owner' AND active) THEN
    RAISE NOTICE 'An active owner already exists; no account was changed.';
    RETURN;
  END IF;
  IF (SELECT count(*) FROM auth.users) <> 1 THEN
    RAISE EXCEPTION 'Create exactly one confirmed administrator in Authentication > Users first. For multiple users, use the explicit UID instructions in SUPABASE_SETUP_AR.md.';
  END IF;
  SELECT id INTO owner_id FROM auth.users LIMIT 1;
  INSERT INTO public.dar_admin_profiles(user_id,name,role,active)
  VALUES(owner_id,'صاحب المشروع','owner',true)
  ON CONFLICT(user_id) DO UPDATE SET role='owner',active=true;
END $$;
