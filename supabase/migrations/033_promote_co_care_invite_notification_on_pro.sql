-- When a user gains Crittr Pro, upgrade co-care "needs Pro" nudges to standard invites
-- (Accept/Decline) for any still-pending invite tied to that notification.

CREATE OR REPLACE FUNCTION public.promote_co_care_invite_notifications_on_pro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  should_promote boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    should_promote :=
      NEW.crittr_pro_until IS NOT NULL
      AND NEW.crittr_pro_until > now();
  ELSIF TG_OP = 'UPDATE' THEN
    should_promote :=
      NEW.crittr_pro_until IS NOT NULL
      AND NEW.crittr_pro_until > now()
      AND NOT (
        OLD.crittr_pro_until IS NOT NULL
        AND OLD.crittr_pro_until > now()
      );
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NOT should_promote THEN
    RETURN NEW;
  END IF;

  SET LOCAL row_security TO off;

  UPDATE public.notifications n
  SET
    type = 'co_care_invite',
    body = format(
      '%s invited you to co-care for %s.',
      COALESCE(
        NULLIF(trim(concat_ws(' ', pf.first_name, pf.last_name)), ''),
        'Someone'
      ),
      COALESCE(pt.name, 'their pet')
    ),
    data = n.data - 'href',
    read = false
  FROM public.co_carer_invites ci
  LEFT JOIN public.profiles pf ON pf.id = ci.invited_by
  LEFT JOIN public.pets pt ON pt.id = ci.pet_id
  WHERE n.user_id = NEW.id
    AND n.type = 'co_care_invite_requires_pro'
    AND ci.id = (n.data->>'invite_id')::uuid
    AND ci.status = 'pending'
    AND ci.invited_user_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_co_care_invites_on_pro_ins ON public.profiles;
CREATE TRIGGER trg_promote_co_care_invites_on_pro_ins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_co_care_invite_notifications_on_pro();

DROP TRIGGER IF EXISTS trg_promote_co_care_invites_on_pro_upd ON public.profiles;
CREATE TRIGGER trg_promote_co_care_invites_on_pro_upd
  AFTER UPDATE OF crittr_pro_until ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_co_care_invite_notifications_on_pro();
