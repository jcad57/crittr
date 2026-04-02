-- In-app co-care invite notifications:
-- 1) INSERT trigger + SECURITY DEFINER often cannot insert into RLS-protected
--    notifications (policy is TO authenticated; trigger runs as definer role).
--    Registered users: notification is created by the inviter's client (RLS allows it).
-- 2) Backfill when invited_user_id is set later: keep UPDATE trigger; disable RLS
--    for that INSERT only inside the definer function.

DROP TRIGGER IF EXISTS trg_co_carer_invite_notify_insert ON public.co_carer_invites;

CREATE OR REPLACE FUNCTION public.notify_on_co_carer_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
  invite_id uuid;
  inviter_name text;
  pet_name text;
BEGIN
  -- Only backfill path: invited_user_id set after signup / email link
  IF TG_OP <> 'UPDATE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;
  IF NEW.invited_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.invited_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  target_user := NEW.invited_user_id;
  invite_id := NEW.id;

  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = target_user
      AND n.type = 'co_care_invite'
      AND (n.data->>'invite_id')::uuid = invite_id
  ) THEN
    RETURN NEW;
  END IF;

  SET LOCAL row_security TO off;

  SELECT COALESCE(
    NULLIF(TRIM(BOTH FROM concat_ws(' ', p.first_name, p.last_name)), ''),
    'Someone'
  )
  INTO inviter_name
  FROM public.profiles p
  WHERE p.id = NEW.invited_by;

  SELECT COALESCE(pt.name, 'their pet')
  INTO pet_name
  FROM public.pets pt
  WHERE pt.id = NEW.pet_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    target_user,
    'co_care_invite',
    'Co-care invitation',
    COALESCE(inviter_name, 'Someone') || ' invited you to co-care for ' || COALESCE(pet_name, 'their pet') || '.',
    jsonb_build_object('pet_id', NEW.pet_id, 'invite_id', invite_id)
  );

  RETURN NEW;
END;
$$;

-- Recreate UPDATE trigger only (INSERT trigger dropped above)
DROP TRIGGER IF EXISTS trg_co_carer_invite_notify_update ON public.co_carer_invites;
CREATE TRIGGER trg_co_carer_invite_notify_update
  AFTER UPDATE OF invited_user_id ON public.co_carer_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_co_carer_invite();
