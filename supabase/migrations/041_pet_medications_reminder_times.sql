-- Multiple daily reminder times (HH:mm) for medications. `reminder_time` remains the first
-- slot for legacy clients; when only one time exists, `reminder_times` is null.

alter table public.pet_medications
  add column if not exists reminder_times jsonb;

comment on column public.pet_medications.reminder_times is
  'JSON array of HH:mm strings (24h) for multiple daily dose reminders. Null when a single reminder_time is enough.';
