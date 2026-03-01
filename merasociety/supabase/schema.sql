-- MeraSociety Database Schema
-- Run this in your Supabase SQL Editor to DROP everything and rebuild from scratch.

-- ============================================================
-- DROP EVERYTHING (order matters — children before parents)
-- ============================================================

-- Remove tables from realtime publication first (ignore if not present)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime drop table messages;
  end if;
exception when others then null;
end $$;
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime drop table notifications;
  end if;
exception when others then null;
end $$;

-- Drop functions
drop function if exists check_booking_fairness(uuid, uuid, date, time, time);
drop function if exists generate_pass_code();
drop function if exists auto_expire_passes();

-- Drop tables (children first, parents last)
drop table if exists audit_log cascade;
drop table if exists feedback cascade;
drop table if exists notifications cascade;
drop table if exists bookings cascade;
drop table if exists courts cascade;
drop table if exists visitor_passes cascade;
drop table if exists messages cascade;
drop table if exists channels cascade;
drop table if exists listings cascade;
drop table if exists announcement_seen cascade;
drop table if exists announcement_comments cascade;
drop table if exists announcements cascade;
drop table if exists members cascade;
drop table if exists societies cascade;

-- ============================================================
-- REBUILD
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- SOCIETIES
-- ============================================================
create table if not exists societies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  invite_code text unique not null,
  settings jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- MEMBERS
-- ============================================================
create table if not exists members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  society_id uuid references societies(id) on delete cascade,
  flat_number text not null,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null default 'resident' check (role in ('admin', 'resident', 'guard')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  is_verified boolean default false,
  created_at timestamptz default now(),
  unique(user_id, society_id)
);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  society_id uuid references societies(id) on delete cascade,
  author_id uuid references members(id) on delete cascade,
  title text not null,
  content text not null,
  is_pinned boolean default false,
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists announcement_comments (
  id uuid primary key default uuid_generate_v4(),
  announcement_id uuid references announcements(id) on delete cascade,
  author_id uuid references members(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists announcement_seen (
  id uuid primary key default uuid_generate_v4(),
  announcement_id uuid references announcements(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  seen_at timestamptz default now(),
  unique(announcement_id, member_id)
);

-- ============================================================
-- CHAT CHANNELS & MESSAGES
-- ============================================================
create table if not exists channels (
  id uuid primary key default uuid_generate_v4(),
  society_id uuid references societies(id) on delete cascade,
  name text not null,
  description text,
  type text default 'topic' check (type in ('general', 'topic', 'listing')),
  listing_id uuid,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references channels(id) on delete cascade,
  sender_id uuid references members(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- BAZAAR LISTINGS
-- ============================================================
create table if not exists listings (
  id uuid primary key default uuid_generate_v4(),
  society_id uuid references societies(id) on delete cascade,
  author_id uuid references members(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('buy_sell', 'services', 'food')),
  price decimal,
  images text[] default '{}',
  tags text[] default '{}',
  status text default 'active' check (status in ('active', 'sold', 'expired')),
  ai_extracted jsonb,
  contact_info text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- VISITOR PASSES
-- ============================================================
create table if not exists visitor_passes (
  id uuid primary key default uuid_generate_v4(),
  society_id uuid references societies(id) on delete cascade,
  created_by uuid references members(id) on delete cascade,
  visitor_name text not null,
  visitor_phone text,
  pass_type text not null check (pass_type in ('guest', 'contractor', 'delivery')),
  pass_code text unique not null,
  purpose text,
  expected_date date not null,
  expected_time_start time,
  expected_time_end time,
  status text default 'active' check (status in ('active', 'used', 'expired', 'cancelled')),
  verified_by uuid references members(id),
  verified_at timestamptz,
  is_one_time boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- ============================================================
-- SPORTS COURTS & BOOKINGS
-- ============================================================
create table if not exists courts (
  id uuid primary key default uuid_generate_v4(),
  society_id uuid references societies(id) on delete cascade,
  name text not null,
  sport text not null,
  description text,
  slot_duration_minutes int default 60,
  max_daily_hours_per_flat int default 2,
  open_time time default '06:00',
  close_time time default '22:00',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  court_id uuid references courts(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  society_id uuid references societies(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  created_at timestamptz default now(),
  unique(court_id, date, start_time)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references members(id) on delete cascade,
  society_id uuid references societies(id) on delete cascade,
  title text not null,
  body text,
  type text default 'info',
  is_read boolean default false,
  link text,
  created_at timestamptz default now()
);

-- ============================================================
-- FEEDBACK
-- ============================================================
create table if not exists feedback (
  id uuid primary key default uuid_generate_v4(),
  society_id uuid references societies(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  type text default 'general' check (type in ('bug', 'feature', 'general', 'complaint')),
  title text not null,
  description text,
  status text default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz default now()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  society_id uuid references societies(id) on delete cascade,
  member_id uuid references members(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (DISABLED)
-- ============================================================
-- RLS is disabled for all tables. Access control is handled at the
-- application layer (middleware + server-side checks).

alter table societies disable row level security;
alter table members disable row level security;
alter table announcements disable row level security;
alter table announcement_comments disable row level security;
alter table announcement_seen disable row level security;
alter table channels disable row level security;
alter table messages disable row level security;
alter table listings disable row level security;
alter table visitor_passes disable row level security;
alter table courts disable row level security;
alter table bookings disable row level security;
alter table notifications disable row level security;
alter table feedback disable row level security;
alter table audit_log disable row level security;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_members_user_id on members(user_id);
create index if not exists idx_members_society_id on members(society_id);
create index if not exists idx_announcements_society_id on announcements(society_id);
create index if not exists idx_announcements_created_at on announcements(created_at desc);
create index if not exists idx_messages_channel_id on messages(channel_id);
create index if not exists idx_messages_created_at on messages(created_at);
create index if not exists idx_listings_society_id on listings(society_id);
create index if not exists idx_listings_category on listings(category);
create index if not exists idx_listings_status on listings(status);
create index if not exists idx_visitor_passes_society_id on visitor_passes(society_id);
create index if not exists idx_visitor_passes_pass_code on visitor_passes(pass_code);
create index if not exists idx_bookings_court_date on bookings(court_id, date);
create index if not exists idx_bookings_member_date on bookings(member_id, date);
create index if not exists idx_notifications_member_id on notifications(member_id);

-- Full text search on listings
create index if not exists idx_listings_fts on listings using gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to check booking fairness (max hours per flat per day)
create or replace function check_booking_fairness(
  p_court_id uuid,
  p_member_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time
) returns boolean as $$
declare
  v_max_hours int;
  v_current_hours numeric;
  v_requested_hours numeric;
  v_flat text;
  v_society_id uuid;
begin
  -- Get the court's max daily hours and the member's flat
  select c.max_daily_hours_per_flat, m.flat_number, m.society_id
  into v_max_hours, v_flat, v_society_id
  from courts c, members m
  where c.id = p_court_id and m.id = p_member_id;

  -- Calculate requested duration in hours
  v_requested_hours := extract(epoch from (p_end_time - p_start_time)) / 3600;

  -- Calculate current booked hours for this flat on this date
  select coalesce(sum(extract(epoch from (b.end_time - b.start_time)) / 3600), 0)
  into v_current_hours
  from bookings b
  join members m on b.member_id = m.id
  where b.court_id = p_court_id
    and b.date = p_date
    and b.status = 'confirmed'
    and m.flat_number = v_flat
    and m.society_id = v_society_id;

  return (v_current_hours + v_requested_hours) <= v_max_hours;
end;
$$ language plpgsql security definer;

-- Function to generate unique pass code
create or replace function generate_pass_code() returns text as $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    select exists(select 1 from visitor_passes where pass_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$ language plpgsql;

-- Trigger to auto-expire passes
create or replace function auto_expire_passes() returns trigger as $$
begin
  update visitor_passes
  set status = 'expired'
  where status = 'active'
    and (
      expires_at < now()
      or (expected_date < current_date and expected_time_end is not null)
    );
  return null;
end;
$$ language plpgsql;

-- ============================================================
-- REALTIME
-- ============================================================
-- Enable realtime for messages (chat)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table messages;
    alter publication supabase_realtime add table notifications;
  end if;
exception when others then null;
end $$;

-- ============================================================
-- SEED DATA
-- ============================================================

-- The admin member (JackBright) is created via the create-admin script.
-- Their member ID is: a62ae5be-c4bd-48b0-aa86-0a207b6abcdf
-- We use this ID as the author for sample content below.

-- Insert society
insert into societies (id, name, address, invite_code, settings) values
  ('00000000-0000-0000-0000-000000000001', 'Sunrise Heights', '42 MG Road, Bengaluru 560001', 'SUNRISE2024',
   '{"max_passes_per_day": 5, "maintenance_amount": 3500}')
on conflict (id) do nothing;

-- Insert courts
insert into courts (id, society_id, name, sport, description, slot_duration_minutes, max_daily_hours_per_flat) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Badminton Court A', 'Badminton', 'Indoor badminton court with LED lighting', 60, 2),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Tennis Court', 'Tennis', 'Outdoor tennis court with floodlights', 60, 2),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Basketball Court', 'Basketball', 'Half court behind clubhouse', 60, 2),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'Table Tennis', 'Table Tennis', 'Indoor TT tables in recreation room', 30, 2)
on conflict (id) do nothing;

-- Insert channels
insert into channels (id, society_id, name, description, type) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'General', 'Society-wide discussions', 'general'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Buy & Sell', 'Buy, sell, or exchange items', 'topic'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Services', 'Recommend maids, cooks, plumbers etc.', 'topic'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Food Corner', 'Home food orders and offers', 'topic'),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', 'Sports', 'Court bookings and sports discussions', 'topic'),
  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000001', 'Maintenance', 'Society maintenance issues', 'topic')
on conflict (id) do nothing;
