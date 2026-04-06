-- Run this in Supabase SQL Editor — drop and recreate for latest structure

drop table if exists planner_data;

create table planner_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  exam_dates jsonb default '{}'::jsonb,
  study_leave_start text default '2026-05-04',
  blocked_dates jsonb default '{}'::jsonb,
  confidence_levels jsonb default '{}'::jsonb,
  manual_sessions jsonb default '{}'::jsonb,
  subject_xp jsonb default '{}'::jsonb,
  croatia_start text default '2026-04-08',
  croatia_end text default '2026-04-11',
  updated_at timestamptz default now()
);

alter table planner_data enable row level security;

create policy "Users can manage own data"
  on planner_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Parent can read all data"
  on planner_data for select
  using (true);
