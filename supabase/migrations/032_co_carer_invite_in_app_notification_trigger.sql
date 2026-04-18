-- Reliable in-app co-care notifications when an invite row is inserted with a known
-- invitee (invited_user_id). Uses SECURITY DEFINER + row_security off so inserts
-- succeed regardless of client session (migration 020 removed the INSERT trigger).
-- Pro invitees: co_care_invite; non‑Pro: co_care_invite_requires_pro (href → upgrade).

CREATE OR REPLACE FUNCTION public.notify_co_carer_invite_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter_name text;
  pet_name text;
  target_has_pro boolean;
BEGIN
  IF NEW.invited_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = NEW.invited_user_id
      AND n.type IN ('co_care_invite', 'co_care_invite_requires_pro')
      AND (n.data->>'invite_id')::uuid = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

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

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = NEW.invited_user_id
      AND pr.crittr_pro_until IS NOT NULL
      AND pr.crittr_pro_until > now()
  )
  INTO target_has_pro;

  BEGIN
    SET LOCAL row_security TO off;

    IF target_has_pro THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.invited_user_id,
        'co_care_invite',
        'Co-care invitation',
        COALESCE(inviter_name, 'Someone') || ' invited you to co-care for ' || COALESCE(pet_name, 'their pet') || '.',
        jsonb_build_object('pet_id', NEW.pet_id, 'invite_id', NEW.id)
      );
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.invited_user_id,
        'co_care_invite_requires_pro',
        'Co-care invitation',
        COALESCE(inviter_name, 'Someone') || ' invited you to co-care for ' || COALESCE(pet_name, 'their pet') || '. Upgrade to Crittr Pro to accept — tap here.',
        jsonb_build_object(
          'pet_id', NEW.pet_id,
          'invite_id', NEW.id,
          'href', '/(logged-in)/upgrade'
        )
      );
    END IF;
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE WARNING 'notify_co_carer_invite_after_insert: skipped (FK) invite_id=%', NEW.id;
    WHEN OTHERS THEN
      RAISE WARNING 'notify_co_carer_invite_after_insert: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_co_carer_invite_notify_insert ON public.co_carer_invites;
CREATE TRIGGER trg_co_carer_invite_notify_insert
  AFTER INSERT ON public.co_carer_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_co_carer_invite_after_insert();

-- Realtime: invitees see new rows without polling-only delays (RLS applies to events).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
