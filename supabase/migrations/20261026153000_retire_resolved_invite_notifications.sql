-- Inbox actions must not outlive the invitation they act on. Older app builds
-- only display Accept/Decline on unread invite notifications.
CREATE OR REPLACE FUNCTION public.retire_co_care_invite_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;

  UPDATE public.notifications
  SET read = true
  WHERE type IN ('co_care_invite', 'co_care_invite_requires_pro')
    AND data->>'invite_id' = OLD.id::text
    AND user_id = OLD.invited_user_id
    AND read = false;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS retire_co_care_invite_notifications ON public.co_carer_invites;
CREATE TRIGGER retire_co_care_invite_notifications
AFTER UPDATE OF status OR DELETE ON public.co_carer_invites
FOR EACH ROW EXECUTE FUNCTION public.retire_co_care_invite_notifications();

-- Retire existing orphaned/resolved notifications without deleting inbox
-- history, recreating invitations or changing membership/authorization data.
UPDATE public.notifications n
SET read = true
WHERE n.type IN ('co_care_invite', 'co_care_invite_requires_pro')
  AND n.read = false
  AND NOT EXISTS (
    SELECT 1 FROM public.co_carer_invites i
    JOIN public.pets p ON p.id = i.pet_id
    WHERE i.id::text = n.data->>'invite_id'
      AND i.invited_user_id = n.user_id
      AND i.invited_by = p.owner_id
      AND i.status = 'pending'
  );
