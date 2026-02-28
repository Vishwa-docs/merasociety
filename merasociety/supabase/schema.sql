-- MeraSociety Database Schema
-- Run this in your Supabase SQL Editor

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
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
alter table societies enable row level security;
alter table members enable row level security;
alter table announcements enable row level security;
alter table announcement_comments enable row level security;
alter table announcement_seen enable row level security;
alter table channels enable row level security;
alter table messages enable row level security;
alter table listings enable row level security;
alter table visitor_passes enable row level security;
alter table courts enable row level security;
alter table bookings enable row level security;
alter table notifications enable row level security;
alter table feedback enable row level security;
alter table audit_log enable row level security;

-- Societies: members can read their society
create policy "Members can view their society" on societies
  for select using (
    id in (select society_id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Anyone can view society by invite code" on societies
  for select using (true);

-- Members: approved members can view other members in same society
create policy "Members can view society members" on members
  for select using (
    society_id in (select society_id from members where user_id = auth.uid())
  );

create policy "Users can insert their own member record" on members
  for insert with check (user_id = auth.uid());

create policy "Users can update their own member record" on members
  for update using (user_id = auth.uid());

create policy "Admins can update any member in their society" on members
  for update using (
    society_id in (
      select society_id from members where user_id = auth.uid() and role = 'admin' and status = 'approved'
    )
  );

-- Announcements: approved members can read, admins can write
create policy "Members can view announcements" on announcements
  for select using (
    society_id in (select society_id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Admins can create announcements" on announcements
  for insert with check (
    society_id in (select society_id from members where user_id = auth.uid() and role = 'admin' and status = 'approved')
  );

create policy "Admins can update announcements" on announcements
  for update using (
    society_id in (select society_id from members where user_id = auth.uid() and role = 'admin' and status = 'approved')
  );

-- Comments: members can read and create
create policy "Members can view comments" on announcement_comments
  for select using (
    announcement_id in (
      select id from announcements where society_id in (
        select society_id from members where user_id = auth.uid() and status = 'approved'
      )
    )
  );

create policy "Members can create comments" on announcement_comments
  for insert with check (
    author_id in (select id from members where user_id = auth.uid() and status = 'approved')
  );

-- Seen tracking
create policy "Members can view seen status" on announcement_seen
  for select using (
    member_id in (select id from members where user_id = auth.uid())
  );

create policy "Members can mark as seen" on announcement_seen
  for insert with check (
    member_id in (select id from members where user_id = auth.uid())
  );

-- Channels: approved members
create policy "Members can view channels" on channels
  for select using (
    society_id in (select society_id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Admins can create channels" on channels
  for insert with check (
    society_id in (select society_id from members where user_id = auth.uid() and role = 'admin' and status = 'approved')
  );

-- Messages: approved members
create policy "Members can view messages" on messages
  for select using (
    channel_id in (
      select id from channels where society_id in (
        select society_id from members where user_id = auth.uid() and status = 'approved'
      )
    )
  );

create policy "Members can send messages" on messages
  for insert with check (
    sender_id in (select id from members where user_id = auth.uid() and status = 'approved')
  );

-- Listings: approved members
create policy "Members can view listings" on listings
  for select using (
    society_id in (select society_id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Members can create listings" on listings
  for insert with check (
    author_id in (select id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Authors can update their listings" on listings
  for update using (
    author_id in (select id from members where user_id = auth.uid())
  );

-- Visitor passes: approved members
create policy "Members can view their passes" on visitor_passes
  for select using (
    created_by in (select id from members where user_id = auth.uid() and status = 'approved')
    or society_id in (
      select society_id from members where user_id = auth.uid() and role in ('admin', 'guard') and status = 'approved'
    )
  );

create policy "Members can create passes" on visitor_passes
  for insert with check (
    created_by in (select id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Guards can update pass status" on visitor_passes
  for update using (
    society_id in (
      select society_id from members where user_id = auth.uid() and role in ('admin', 'guard') and status = 'approved'
    )
  );

-- Courts & Bookings
create policy "Members can view courts" on courts
  for select using (
    society_id in (select society_id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Members can view bookings" on bookings
  for select using (
    society_id in (select society_id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Members can create bookings" on bookings
  for insert with check (
    member_id in (select id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Members can cancel their bookings" on bookings
  for update using (
    member_id in (select id from members where user_id = auth.uid())
  );

-- Notifications
create policy "Users can view their notifications" on notifications
  for select using (
    member_id in (select id from members where user_id = auth.uid())
  );

create policy "Users can update their notifications" on notifications
  for update using (
    member_id in (select id from members where user_id = auth.uid())
  );

-- Feedback
create policy "Members can view society feedback" on feedback
  for select using (
    society_id in (select society_id from members where user_id = auth.uid() and status = 'approved')
  );

create policy "Members can create feedback" on feedback
  for insert with check (
    member_id in (select id from members where user_id = auth.uid() and status = 'approved')
  );

-- Audit log: admins only
create policy "Admins can view audit log" on audit_log
  for select using (
    society_id in (
      select society_id from members where user_id = auth.uid() and role = 'admin' and status = 'approved'
    )
  );

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
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;

-- ============================================================
-- SEED DATA FOR DEMO
-- ============================================================
-- Insert demo society
insert into societies (id, name, address, invite_code) values
  ('00000000-0000-0000-0000-000000000001', 'Sunrise Heights', '42 MG Road, Bengaluru 560001', 'SUNRISE2026')
on conflict (id) do nothing;

-- Insert demo courts
insert into courts (id, society_id, name, sport, description, slot_duration_minutes, max_daily_hours_per_flat) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Badminton Court A', 'Badminton', 'Indoor badminton court with LED lighting', 60, 2),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Tennis Court', 'Tennis', 'Outdoor tennis court', 60, 2),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Basketball Court', 'Basketball', 'Half court behind clubhouse', 60, 2),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'Table Tennis', 'Table Tennis', 'Indoor TT tables in recreation room', 30, 2)
on conflict (id) do nothing;

-- Insert demo channels
insert into channels (id, society_id, name, description, type) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'General', 'Society-wide discussions', 'general'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Buy & Sell', 'Buy, sell, or exchange items', 'topic'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Services', 'Recommend maids, cooks, plumbers etc.', 'topic'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Food Corner', 'Home food orders and offers', 'topic'),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', 'Sports', 'Court bookings and sports discussions', 'topic'),
  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000001', 'Maintenance', 'Society maintenance issues', 'topic')
on conflict (id) do nothing;
