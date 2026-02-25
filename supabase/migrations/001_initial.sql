-- ============================================================
-- AuraCycle - Supabase Database Migration
-- Run this in your Supabase SQL editor at:
-- https://app.supabase.com → Your Project → SQL Editor
-- ============================================================

-- ─── PROFILES TABLE ──────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  birth_year      int,
  avatar_url      text,
  onboarding_completed boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── CYCLE SETTINGS TABLE ────────────────────────────────────
create table if not exists public.cycle_settings (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  average_cycle_length        int not null default 28,
  average_period_length       int not null default 5,
  last_period_start           date,
  last_period_end             date,
  notifications_enabled       boolean default false,
  reminder_period_before      int default 2,
  reminder_period_time        text default '08:00',
  reminder_symptoms_enabled   boolean default false,
  reminder_symptoms_time      text default '20:00',
  reminder_mood_enabled       boolean default false,
  reminder_mood_time          text default '21:00',
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now(),
  constraint cycle_settings_user_unique unique (user_id)
);

-- ─── CYCLE LOGS TABLE ────────────────────────────────────────
create table if not exists public.cycle_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  log_type        text not null check (log_type in ('period', 'symptom', 'mood', 'note')),
  flow_intensity  text check (flow_intensity in ('spotting', 'light', 'medium', 'heavy')),
  is_period_end   boolean default false,
  symptoms        text[] default '{}',
  moods           text[] default '{}',
  notes           text,
  sleep_hours     numeric,
  sleep_quality   int check (sleep_quality between 1 and 5),
  water_intake    int,
  exercise        boolean default false,
  exercise_type   text,
  stress_level    int check (stress_level between 1 and 5),
  created_at      timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
-- CRITICAL: Ensures complete data isolation between users

alter table public.profiles       enable row level security;
alter table public.cycle_settings enable row level security;
alter table public.cycle_logs     enable row level security;

-- Drop policies if they exist (safe to re-run)
drop policy if exists "profiles_own"  on public.profiles;
drop policy if exists "settings_own"  on public.cycle_settings;
drop policy if exists "logs_own"      on public.cycle_logs;

-- Users can ONLY access their own data — no exceptions
create policy "profiles_own"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "settings_own"
  on public.cycle_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "logs_own"
  on public.cycle_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── INDEXES FOR PERFORMANCE ─────────────────────────────────
create index if not exists idx_cycle_logs_user_date   on public.cycle_logs(user_id, date desc);
create index if not exists idx_cycle_logs_user_type   on public.cycle_logs(user_id, log_type);
create index if not exists idx_cycle_settings_user    on public.cycle_settings(user_id);
