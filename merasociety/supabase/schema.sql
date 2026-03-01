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
-- SEED DATA — Demo Society: Sunrise Heights
-- ============================================================

-- The admin (Jack Bright) is created via the create-admin script.
-- All other personas are display-only (user_id = NULL, cannot log in).

-- Society
insert into societies (id, name, address, invite_code, settings) values
  ('00000000-0000-0000-0000-000000000001', 'Sunrise Heights', '42 MG Road, Bengaluru 560001', 'SUNRISE2024',
   '{"max_passes_per_day": 5, "maintenance_amount": 3500}')
on conflict (id) do nothing;

-- ── Demo Members (display-only, user_id NULL) ────────────────
-- Jack Bright (admin) is inserted by the create-admin script with a real auth user.
-- We add his record here with a fixed ID for FK references in seed data.
-- The create-admin script will use its own ID; these are just for demo content FKs.
insert into members (id, user_id, society_id, flat_number, full_name, phone, avatar_url, role, status, is_verified, created_at) values
  ('00000000-0000-0000-0000-000000000a01', null, '00000000-0000-0000-0000-000000000001', 'B-202', 'Rajini Kanth', '+91 9876500001', '/avatars/rajini-kanth.avif', 'resident', 'approved', true, now() - interval '45 days'),
  ('00000000-0000-0000-0000-000000000a02', null, '00000000-0000-0000-0000-000000000001', 'C-303', 'Virat Kohli', '+91 9876500002', '/avatars/virat-kohli.avif', 'resident', 'approved', true, now() - interval '40 days'),
  ('00000000-0000-0000-0000-000000000a03', null, '00000000-0000-0000-0000-000000000001', 'A-102', 'Deepika Padukone', '+91 9876500003', '/avatars/deepika-padukone.webp', 'resident', 'approved', true, now() - interval '38 days'),
  ('00000000-0000-0000-0000-000000000a04', null, '00000000-0000-0000-0000-000000000001', 'D-404', 'Shah Rukh Khan', '+91 9876500004', '/avatars/shah-rukh-khan.jpg', 'resident', 'approved', true, now() - interval '35 days'),
  ('00000000-0000-0000-0000-000000000a05', null, '00000000-0000-0000-0000-000000000001', 'B-105', 'Anushka Sharma', '+91 9876500005', '/avatars/anushka-sharma.jpeg', 'resident', 'approved', true, now() - interval '30 days'),
  ('00000000-0000-0000-0000-000000000a06', null, '00000000-0000-0000-0000-000000000001', 'Gate 1', 'Ramu Singh', '+91 9876500006', null, 'guard', 'approved', true, now() - interval '50 days'),
  ('00000000-0000-0000-0000-000000000a07', null, '00000000-0000-0000-0000-000000000001', 'C-101', 'Tamannah Bhatia', '+91 9876500007', '/avatars/tamannah-bhatia.jpeg', 'resident', 'pending', false, now() - interval '2 days')
on conflict (id) do nothing;

-- ── Courts ───────────────────────────────────────────────────
insert into courts (id, society_id, name, sport, description, slot_duration_minutes, max_daily_hours_per_flat) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Badminton Court A', 'Badminton', 'Indoor badminton court with LED lighting', 60, 2),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Tennis Court', 'Tennis', 'Outdoor tennis court with floodlights', 60, 2),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Basketball Court', 'Basketball', 'Half court behind clubhouse', 60, 2),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'Table Tennis', 'Table Tennis', 'Indoor TT tables in recreation room', 30, 2)
on conflict (id) do nothing;

-- ── Chat Channels ────────────────────────────────────────────
insert into channels (id, society_id, name, description, type) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'General', 'Society-wide discussions', 'general'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Buy & Sell', 'Buy, sell, or exchange items', 'topic'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Services', 'Recommend maids, cooks, plumbers etc.', 'topic'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Food Corner', 'Home food orders and offers', 'topic'),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', 'Sports', 'Court bookings and sports discussions', 'topic'),
  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000001', 'Maintenance', 'Society maintenance issues', 'topic')
on conflict (id) do nothing;

-- ── Announcements ────────────────────────────────────────────
insert into announcements (id, society_id, author_id, title, content, is_pinned, priority, created_at) values
  ('00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a01',
   'Water Tank Cleaning — March 5th',
   'Dear residents, the overhead water tanks will be cleaned on March 5th from 9 AM to 3 PM. Please store enough water for the day. Sorry for any inconvenience.',
   true, 'high', now() - interval '3 days'),

  ('00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a01',
   'Holi Celebration at Clubhouse 🎨',
   'We are organizing a Holi celebration at the clubhouse on March 14th! Colors, music, and snacks will be arranged. Kids'' games start at 10 AM, adults from 12 PM onwards. Bring your family and friends!',
   false, 'normal', now() - interval '5 days'),

  ('00000000-0000-0000-0000-000000000303',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a04',
   'Parking Rules Reminder',
   'Kindly park only in your allotted parking slots. Visitor vehicles must use the visitor lot near Gate 2. Cars parked in fire lanes will be towed without notice. Let''s keep the roads clear for everyone.',
   false, 'normal', now() - interval '10 days'),

  ('00000000-0000-0000-0000-000000000304',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a03',
   'Monthly Maintenance Due — March 2026',
   'Monthly maintenance of ₹3,500 is due by March 10th. You can pay via UPI to the society account or hand over a cheque at the office. Late payments will attract a ₹200 penalty.',
   true, 'urgent', now() - interval '1 day'),

  ('00000000-0000-0000-0000-000000000305',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a02',
   'New Gym Equipment Installed! 💪',
   'Great news! We have installed new treadmills and a lat pulldown machine in the gym. Please follow the gym rules poster on the wall. Wipe down equipment after use. Gym timings remain 5:30 AM to 10 PM.',
   false, 'normal', now() - interval '7 days')
on conflict (id) do nothing;

-- Announcement comments
insert into announcement_comments (id, announcement_id, author_id, content, created_at) values
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000a02', 'Thanks for the heads up! Will store water.', now() - interval '2 days 20 hours'),
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000a03', 'Can we get an update once the cleaning is done?', now() - interval '2 days 18 hours'),
  ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000a05', 'Excited! Are we doing a potluck this year too?', now() - interval '4 days'),
  ('00000000-0000-0000-0000-000000000c04', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000a01', 'Yes potluck is on! Please sign up on the sheet at the notice board.', now() - interval '3 days 22 hours'),
  ('00000000-0000-0000-0000-000000000c05', '00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000a02', 'Awesome! Been waiting for new treadmills.', now() - interval '6 days')
on conflict (id) do nothing;

-- ── Chat Messages (General channel) ─────────────────────────
insert into messages (id, channel_id, sender_id, content, created_at) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000a02', 'Good morning everyone! 🏏', now() - interval '2 days 8 hours'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000a01', 'Morning! Beautiful day today.', now() - interval '2 days 7 hours 55 minutes'),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000a03', 'Has anyone seen the stray cat near B block? She had kittens!', now() - interval '2 days 6 hours'),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000a05', 'Yes! They are so cute 🐱 I left some milk for them.', now() - interval '2 days 5 hours 30 minutes'),
  ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000a04', 'We should get them adopted. I can contact the local shelter.', now() - interval '2 days 5 hours'),
  ('00000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000a01', 'That would be wonderful, Amit!', now() - interval '2 days 4 hours 45 minutes')
on conflict (id) do nothing;

-- Messages in Buy & Sell channel
insert into messages (id, channel_id, sender_id, content, created_at) values
  ('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000a03', 'Anyone interested in a barely used baby stroller? DM me.', now() - interval '3 days'),
  ('00000000-0000-0000-0000-000000000408', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000a05', 'What brand is it? How old?', now() - interval '2 days 23 hours'),
  ('00000000-0000-0000-0000-000000000409', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000a03', 'It''s a Luvlap Galaxy. Just 6 months old, perfect condition.', now() - interval '2 days 22 hours')
on conflict (id) do nothing;

-- Messages in Sports channel
insert into messages (id, channel_id, sender_id, content, created_at) values
  ('00000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000a02', 'Anyone up for badminton this evening? 6 PM?', now() - interval '1 day 8 hours'),
  ('00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000a04', 'I''m in! Let me book Court A.', now() - interval '1 day 7 hours 30 minutes'),
  ('00000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000a01', 'Count me in too 🏸', now() - interval '1 day 7 hours'),
  -- Recent Sports messages (sets up the AI booking demo naturally)
  ('00000000-0000-0000-0000-000000000413', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000a02', 'Just booked badminton at 6 PM today. Anyone up for doubles? 🏸', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000000414', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000a04', 'I got the 7 PM slot right after yours! Let''s warm up together.', now() - interval '1 hour 45 minutes'),
  ('00000000-0000-0000-0000-000000000415', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000a01', 'Morning 7 AM was great today. The court is in excellent condition 👌', now() - interval '1 hour')
on conflict (id) do nothing;

-- Recent messages in Buy & Sell channel (sets up listing detection demo)
insert into messages (id, channel_id, sender_id, content, created_at) values
  ('00000000-0000-0000-0000-000000000416', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000a05', 'Does anyone need a study table? Mine is in great condition, barely used. Asking ₹3,000.', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000000417', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000a03', 'I have some kids'' books (age 5-8) to give away. First come first served!', now() - interval '2 hours 30 minutes')
on conflict (id) do nothing;

-- ── Bazaar Listings ──────────────────────────────────────────
insert into listings (id, society_id, author_id, title, description, category, price, tags, status, contact_info, created_at) values
  ('00000000-0000-0000-0000-000000000501',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a03',
   'Baby Stroller — Luvlap Galaxy',
   'Barely used Luvlap Galaxy stroller in excellent condition. 3-position recline, mosquito net, rain cover included. Original price ₹4,500, selling for ₹2,500.',
   'buy_sell', 2500, '{"baby", "stroller", "luvlap"}', 'active',
   'Call/WhatsApp: +91 9876500003 (Deepika, A-102)',
   now() - interval '5 days'),

  ('00000000-0000-0000-0000-000000000502',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a02',
   'Cricket Coaching for Kids',
   'I coach kids (ages 8-14) every Saturday at the basketball court. Focus on batting, bowling, and fielding basics. Free for society members! Bring your own kit.',
   'services', 0, '{"cricket", "coaching", "kids", "sports"}', 'active',
   'Contact: Virat (C-303) — just drop by on Saturday 7 AM',
   now() - interval '12 days'),

  ('00000000-0000-0000-0000-000000000503',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a05',
   'Home-made Chettinad Meals',
   'Offering fresh home-cooked Chettinad-style lunch and dinner. Menu changes daily — rice, sambar, rasam, kootu, poriyal, and non-veg specials on weekends. Order before 10 AM for lunch, 5 PM for dinner.',
   'food', 150, '{"food", "chettinad", "homemade", "meals"}', 'active',
   'WhatsApp: +91 9876500005 (Deepa, B-105)',
   now() - interval '8 days'),

  ('00000000-0000-0000-0000-000000000504',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a04',
   'Reliable Plumber — Venkatesh',
   'Sharing contact of an excellent plumber. Fixed our kitchen leak in 30 mins, charges reasonable. Venkatesh — +91 98765 43210. He services our area on Tues/Thurs.',
   'services', 0, '{"plumber", "recommendation", "home repair"}', 'active',
   'Mention you are from Sunrise Heights for priority.',
   now() - interval '15 days'),

  ('00000000-0000-0000-0000-000000000505',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a01',
   'Samsung 32" LED TV — Moving Sale',
   'Shifting out overseas, selling my Samsung 32" LED TV. 2023 model, perfect working condition with original remote and box. ₹8,000 firm.',
   'buy_sell', 8000, '{"tv", "samsung", "electronics", "moving sale"}', 'active',
   'Rajini (B-202) — evenings after 7 PM',
   now() - interval '3 days'),

  ('00000000-0000-0000-0000-000000000506',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a05',
   'Weekend Biryani Orders 🍗',
   'Taking orders for Hyderabadi Dum Biryani every Saturday. Chicken ₹250 per plate, Mutton ₹350. Minimum order 2 plates. Order by Thursday evening.',
   'food', 250, '{"biryani", "hyderabadi", "weekend", "non-veg"}', 'active',
   'Deepa (B-105) — WhatsApp only',
   now() - interval '6 days')
on conflict (id) do nothing;

-- ── Visitor Passes ───────────────────────────────────────────
insert into visitor_passes (id, society_id, created_by, visitor_name, visitor_phone, pass_type, pass_code, purpose, expected_date, expected_time_start, expected_time_end, status, verified_by, verified_at, created_at) values
  ('00000000-0000-0000-0000-000000000601',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a03',
   'Ramesh Kumar', '+91 9988776655', 'guest', 'A1B2C3',
   'Dinner at our home', current_date, '18:00', '22:00',
   'active', null, null, now() - interval '4 hours'),

  ('00000000-0000-0000-0000-000000000602',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a04',
   'QuickFix Electricals', '+91 9112233445', 'contractor', 'D4E5F6',
   'AC servicing for D-404', current_date + interval '1 day', '10:00', '13:00',
   'active', null, null, now() - interval '2 hours'),

  ('00000000-0000-0000-0000-000000000603',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a01',
   'Swiggy Delivery', null, 'delivery', 'G7H8I9',
   'Food delivery', current_date - interval '1 day', '19:00', '19:30',
   'used', '00000000-0000-0000-0000-000000000a06', now() - interval '1 day 5 hours', now() - interval '1 day 6 hours'),

  ('00000000-0000-0000-0000-000000000604',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000a02',
   'Mom & Dad', '+91 9900112233', 'guest', 'J1K2L3',
   'Weekend visit', current_date + interval '2 days', '09:00', '21:00',
   'active', null, null, now() - interval '1 day')
on conflict (id) do nothing;

-- ── Bookings ─────────────────────────────────────────────────
-- Realistic bookings from residents. YOUR admin account (Jack Bright)
-- has ZERO bookings — so the AI booking agent can find real available
-- slots for you. Uses current_date so it's always fresh.

-- Badminton Court A: Virat 6-7 PM, Shah Rukh 7-8 PM, Rajini 7-8 AM, Deepika 8-9 AM
insert into bookings (id, court_id, member_id, society_id, date, start_time, end_time, status, created_at) values
  ('00000000-0000-0000-0000-000000000701',
   '00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000a02',
   '00000000-0000-0000-0000-000000000001',
   current_date, '18:00', '19:00', 'confirmed', now() - interval '1 day'),

  ('00000000-0000-0000-0000-000000000702',
   '00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000a04',
   '00000000-0000-0000-0000-000000000001',
   current_date, '19:00', '20:00', 'confirmed', now() - interval '1 day'),

  ('00000000-0000-0000-0000-000000000703',
   '00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000a01',
   '00000000-0000-0000-0000-000000000001',
   current_date, '07:00', '08:00', 'confirmed', now() - interval '6 hours'),

  ('00000000-0000-0000-0000-000000000704',
   '00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000a03',
   '00000000-0000-0000-0000-000000000001',
   current_date, '08:00', '09:00', 'confirmed', now() - interval '5 hours'),

  -- Tennis Court: Anushka 7-8 AM, Virat 5-6 PM
  ('00000000-0000-0000-0000-000000000705',
   '00000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000a05',
   '00000000-0000-0000-0000-000000000001',
   current_date, '07:00', '08:00', 'confirmed', now() - interval '4 hours'),

  ('00000000-0000-0000-0000-000000000706',
   '00000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000a02',
   '00000000-0000-0000-0000-000000000001',
   current_date, '17:00', '18:00', 'confirmed', now() - interval '3 hours'),

  -- Table Tennis: Deepika 5:00-5:30 PM, Shah Rukh 5:30-6:00 PM
  ('00000000-0000-0000-0000-000000000707',
   '00000000-0000-0000-0000-000000000104',
   '00000000-0000-0000-0000-000000000a03',
   '00000000-0000-0000-0000-000000000001',
   current_date, '17:00', '17:30', 'confirmed', now() - interval '2 hours'),

  ('00000000-0000-0000-0000-000000000708',
   '00000000-0000-0000-0000-000000000104',
   '00000000-0000-0000-0000-000000000a04',
   '00000000-0000-0000-0000-000000000001',
   current_date, '17:30', '18:00', 'confirmed', now() - interval '2 hours'),

  -- Tomorrow: Rajini 6-7 AM, Virat 6-7 PM (for "book badminton tomorrow" demo)
  ('00000000-0000-0000-0000-000000000709',
   '00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000a01',
   '00000000-0000-0000-0000-000000000001',
   current_date + 1, '06:00', '07:00', 'confirmed', now() - interval '1 hour'),

  ('00000000-0000-0000-0000-000000000710',
   '00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000a02',
   '00000000-0000-0000-0000-000000000001',
   current_date + 1, '18:00', '19:00', 'confirmed', now() - interval '1 hour'),

  -- Yesterday (completed — historical context)
  ('00000000-0000-0000-0000-000000000711',
   '00000000-0000-0000-0000-000000000104',
   '00000000-0000-0000-0000-000000000a03',
   '00000000-0000-0000-0000-000000000001',
   current_date - 1, '17:00', '17:30', 'completed', now() - interval '2 days')
on conflict (id) do nothing;

-- ── Notifications ────────────────────────────────────────────
-- These will show up for the admin (Jack Bright) when we link his real member record.
-- For demo, we attach them to the demo personas so the data exists.
insert into notifications (id, member_id, society_id, title, body, type, is_read, link, created_at) values
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000001', 'New listing posted', 'Deepika Padukone posted "Baby Stroller — Luvlap Galaxy" in Bazaar.', 'listing', false, '/dashboard/bazaar', now() - interval '5 days'),
  ('00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-000000000001', 'Court booked', 'Your Badminton Court A booking for today 6-7 PM is confirmed.', 'booking', true, '/dashboard/sports', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000000803', '00000000-0000-0000-0000-000000000a03', '00000000-0000-0000-0000-000000000001', 'Visitor pass used', 'Swiggy Delivery pass (G7H8I9) was verified by security.', 'visitor', true, '/dashboard/security', now() - interval '1 day 5 hours'),
  ('00000000-0000-0000-0000-000000000804', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000001', 'New member request', 'Tamannah Bhatia (C-101) is waiting for approval.', 'member', false, '/dashboard/admin', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000000805', '00000000-0000-0000-0000-000000000a04', '00000000-0000-0000-0000-000000000001', 'Maintenance due', 'Monthly maintenance of ₹3,500 is due by March 10th.', 'payment', false, '/dashboard/announcements', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000000806', '00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-000000000001', 'Comment on your announcement', 'Virat Kohli commented on "New Gym Equipment Installed!"', 'announcement', false, '/dashboard/announcements', now() - interval '6 days')
on conflict (id) do nothing;

-- ── Feedback ─────────────────────────────────────────────────
insert into feedback (id, society_id, member_id, type, title, description, status, created_at) values
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a04', 'complaint', 'Noisy construction near D block', 'Construction workers start drilling at 7 AM on weekends. Can we enforce a 9 AM start time on Sat/Sun?', 'open', now() - interval '4 days'),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a03', 'feature', 'Add EV charging stations', 'Many residents now have electric cars. Can we install 2-3 EV charging points in the parking area?', 'in_progress', now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a05', 'general', 'Appreciation for gardening team', 'The gardens look beautiful this season. Kudos to the gardening team for the great work!', 'resolved', now() - interval '20 days'),
  ('00000000-0000-0000-0000-000000000904', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a02', 'bug', 'Elevator B stuck on 3rd floor', 'Elevator in B block has been stuck on the 3rd floor since yesterday. Buttons don''t respond. Please get it serviced ASAP.', 'in_progress', now() - interval '1 day')
on conflict (id) do nothing;

-- ── Audit Log ────────────────────────────────────────────────
insert into audit_log (id, society_id, member_id, action, entity_type, entity_id, created_at) values
  ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a01', 'Member approved: Virat Kohli (C-303)', 'member', '00000000-0000-0000-0000-000000000a02', now() - interval '40 days'),
  ('00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a01', 'Member approved: Deepika Padukone (A-102)', 'member', '00000000-0000-0000-0000-000000000a03', now() - interval '38 days'),
  ('00000000-0000-0000-0000-000000000b03', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a01', 'Member approved: Shah Rukh Khan (D-404)', 'member', '00000000-0000-0000-0000-000000000a04', now() - interval '35 days'),
  ('00000000-0000-0000-0000-000000000b04', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a01', 'Member approved: Anushka Sharma (B-105)', 'member', '00000000-0000-0000-0000-000000000a05', now() - interval '30 days'),
  ('00000000-0000-0000-0000-000000000b05', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a01', 'Announcement created: Water Tank Cleaning', 'announcement', '00000000-0000-0000-0000-000000000301', now() - interval '3 days'),
  ('00000000-0000-0000-0000-000000000b06', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a06', 'Visitor pass verified: Swiggy Delivery (G7H8I9)', 'visitor_pass', '00000000-0000-0000-0000-000000000603', now() - interval '1 day 5 hours'),
  ('00000000-0000-0000-0000-000000000b07', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a02', 'Booking created: Badminton Court A, today 6-7 PM', 'booking', '00000000-0000-0000-0000-000000000701', now() - interval '1 day')
on conflict (id) do nothing;
