-- Crittr Pro profile hero + dashboard crown color scheme (slate | gold | purple).
alter table public.profiles
  add column if not exists crittr_pro_banner_theme text not null default 'slate';

comment on column public.profiles.crittr_pro_banner_theme is
  'Pro banner appearance: slate (default), gold, or purple. Invalid values are treated as slate in the app.';
