-- Per-user toggles for local / future push reminder categories (see manage-notifications).

alter table public.profiles
  add column if not exists notify_meals_treats boolean not null default true,
  add column if not exists notify_co_care_activities boolean not null default true,
  add column if not exists notify_medications boolean not null default true,
  add column if not exists notify_vet_visits boolean not null default true;

comment on column public.profiles.notify_meals_treats is
  'Meal/treat portion-time reminders (~5 min after scheduled feed_time).';
comment on column public.profiles.notify_co_care_activities is
  'Daily activity nudge (~3pm) when exercise goals incomplete; co-care alerts.';
comment on column public.profiles.notify_medications is
  'Medication reminders ~5 min before reminder_time.';
comment on column public.profiles.notify_vet_visits is
  'Upcoming vet visit reminders (1h before visit_at).';
