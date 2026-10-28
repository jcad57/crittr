DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='notify_vaccinations') THEN
    ALTER TABLE public.profiles ADD COLUMN notify_vaccinations boolean NOT NULL DEFAULT true;
    -- Preserve a previously selected "All off" when introducing a new category.
    UPDATE public.profiles SET notify_vaccinations=false WHERE NOT notify_meals_treats
      AND NOT notify_co_care_activities AND NOT notify_medications AND NOT notify_vet_visits;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.notify_meals_treats IS
  'Reminders at each scheduled meal and treat time.';
COMMENT ON COLUMN public.profiles.notify_medications IS
  'Reminders at each scheduled medication time.';
COMMENT ON COLUMN public.profiles.notify_co_care_activities IS
  'Scheduled exercise reminders and co-carer activity completion updates.';
COMMENT ON COLUMN public.profiles.notify_vet_visits IS
  'Reminders 24 hours and 1 hour before scheduled vet visits.';
COMMENT ON COLUMN public.profiles.notify_vaccinations IS
  'Reminders at 9 AM device-local time seven calendar days before expires_on and on expires_on.';
