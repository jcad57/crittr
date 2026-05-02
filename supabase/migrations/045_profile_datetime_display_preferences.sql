-- Per-user display preferences for dates and clock times across the app (12h vs 24h, MDY vs DMY).

alter table public.profiles
  add column if not exists time_display_format text not null default '12h'
    check (time_display_format in ('12h', '24h')),
  add column if not exists date_display_format text not null default 'mdy'
    check (date_display_format in ('mdy', 'dmy'));

comment on column public.profiles.time_display_format is
  'How times are shown in the app: 12h (with AM/PM) or 24h.';
comment on column public.profiles.date_display_format is
  'Preferred calendar date layout: mdy (US-style MM/DD) vs dmy (DD/MM-style).';
