-- Reliable resolution of invitee auth user id for co-care invites.
-- Fixes: EXECUTE grant, search_path, trim emails, single-row RPC handling is fixed in app.

CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email text)
RETURNS TABLE (id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT au.id
  FROM auth.users AS au
  WHERE lower(trim(au.email)) = lower(trim(lookup_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(text) TO service_role;
