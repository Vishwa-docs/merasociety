#!/usr/bin/env node

/**
 * Fix RLS (Row-Level Security) policies in Supabase.
 * 
 * The problem: members table SELECT policy self-references, causing infinite recursion.
 * The fix: Use SECURITY DEFINER functions to check membership without triggering RLS.
 * 
 * Usage: node scripts/fix-rls.mjs
 * 
 * Requires: Database password in .env.local as SUPABASE_DB_PASSWORD
 * Or pass via: DB_PASSWORD=xxx node scripts/fix-rls.mjs
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx > 0) {
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
  }
}

const projectRef = 'aohdqwwahunyqwtyrdyi'
const dbPassword = process.env.DB_PASSWORD || env.SUPABASE_DB_PASSWORD || env.SUPABASE_SERVICE_ROLE_KEY

if (!dbPassword) {
  console.error('❌ No database password found. Set SUPABASE_DB_PASSWORD in .env.local or pass DB_PASSWORD env var.')
  process.exit(1)
}

const migrationSQL = `
-- ============================================================
-- FIX RLS: Create SECURITY DEFINER helper functions
-- These functions bypass RLS when executing, breaking the
-- infinite recursion that occurs when members policies
-- query the members table.
-- ============================================================

-- Helper: Get current user's society IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.auth_society_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(society_id), '{}')
  FROM public.members
  WHERE user_id = auth.uid()
$$;

-- Helper: Get current user's APPROVED society IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.auth_approved_society_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(society_id), '{}')
  FROM public.members
  WHERE user_id = auth.uid() AND status = 'approved'
$$;

-- Helper: Get current user's member IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.auth_member_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(id), '{}')
  FROM public.members
  WHERE user_id = auth.uid()
$$;

-- Helper: Get current user's approved member IDs
CREATE OR REPLACE FUNCTION public.auth_approved_member_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(id), '{}')
  FROM public.members
  WHERE user_id = auth.uid() AND status = 'approved'
$$;

-- Helper: Check if user is admin in any of their societies
CREATE OR REPLACE FUNCTION public.auth_admin_society_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(society_id), '{}')
  FROM public.members
  WHERE user_id = auth.uid() AND role = 'admin' AND status = 'approved'
$$;

-- ============================================================
-- DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================

-- Societies
DROP POLICY IF EXISTS "Members can view their society" ON societies;
DROP POLICY IF EXISTS "Anyone can view society by invite code" ON societies;

-- Members
DROP POLICY IF EXISTS "Members can view society members" ON members;
DROP POLICY IF EXISTS "Users can insert their own member record" ON members;
DROP POLICY IF EXISTS "Users can update their own member record" ON members;
DROP POLICY IF EXISTS "Admins can update any member in their society" ON members;

-- Announcements
DROP POLICY IF EXISTS "Members can view announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;

-- Comments
DROP POLICY IF EXISTS "Members can view comments" ON announcement_comments;
DROP POLICY IF EXISTS "Members can create comments" ON announcement_comments;

-- Seen
DROP POLICY IF EXISTS "Members can view seen status" ON announcement_seen;
DROP POLICY IF EXISTS "Members can mark as seen" ON announcement_seen;

-- Channels
DROP POLICY IF EXISTS "Members can view channels" ON channels;
DROP POLICY IF EXISTS "Admins can create channels" ON channels;

-- Messages
DROP POLICY IF EXISTS "Members can view messages" ON messages;
DROP POLICY IF EXISTS "Members can send messages" ON messages;

-- Listings
DROP POLICY IF EXISTS "Members can view listings" ON listings;
DROP POLICY IF EXISTS "Members can create listings" ON listings;
DROP POLICY IF EXISTS "Authors can update their listings" ON listings;

-- Visitor passes
DROP POLICY IF EXISTS "Members can view their passes" ON visitor_passes;
DROP POLICY IF EXISTS "Members can create passes" ON visitor_passes;
DROP POLICY IF EXISTS "Guards can update pass status" ON visitor_passes;

-- Courts & Bookings
DROP POLICY IF EXISTS "Members can view courts" ON courts;
DROP POLICY IF EXISTS "Members can view bookings" ON bookings;
DROP POLICY IF EXISTS "Members can create bookings" ON bookings;
DROP POLICY IF EXISTS "Members can cancel their bookings" ON bookings;

-- Notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;

-- Feedback
DROP POLICY IF EXISTS "Members can view society feedback" ON feedback;
DROP POLICY IF EXISTS "Members can create feedback" ON feedback;

-- Audit log
DROP POLICY IF EXISTS "Admins can view audit log" ON audit_log;

-- ============================================================
-- CREATE NEW POLICIES (using helper functions — no recursion)
-- ============================================================

-- SOCIETIES: Public read (needed for invite code lookup & browsing)
CREATE POLICY "societies_select" ON societies
  FOR SELECT USING (true);

-- MEMBERS: Users see own records + members in their societies
CREATE POLICY "members_select" ON members
  FOR SELECT USING (
    user_id = auth.uid()
    OR society_id = ANY(public.auth_society_ids())
  );

CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_update_self" ON members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "members_update_admin" ON members
  FOR UPDATE USING (
    society_id = ANY(public.auth_admin_society_ids())
  );

-- ANNOUNCEMENTS
CREATE POLICY "announcements_select" ON announcements
  FOR SELECT USING (
    society_id = ANY(public.auth_approved_society_ids())
  );

CREATE POLICY "announcements_insert" ON announcements
  FOR INSERT WITH CHECK (
    society_id = ANY(public.auth_admin_society_ids())
  );

CREATE POLICY "announcements_update" ON announcements
  FOR UPDATE USING (
    society_id = ANY(public.auth_admin_society_ids())
  );

-- ANNOUNCEMENT COMMENTS
CREATE POLICY "comments_select" ON announcement_comments
  FOR SELECT USING (
    announcement_id IN (
      SELECT id FROM announcements WHERE society_id = ANY(public.auth_approved_society_ids())
    )
  );

CREATE POLICY "comments_insert" ON announcement_comments
  FOR INSERT WITH CHECK (
    author_id = ANY(public.auth_approved_member_ids())
  );

-- ANNOUNCEMENT SEEN
CREATE POLICY "seen_select" ON announcement_seen
  FOR SELECT USING (
    member_id = ANY(public.auth_member_ids())
  );

CREATE POLICY "seen_insert" ON announcement_seen
  FOR INSERT WITH CHECK (
    member_id = ANY(public.auth_member_ids())
  );

-- CHANNELS
CREATE POLICY "channels_select" ON channels
  FOR SELECT USING (
    society_id = ANY(public.auth_approved_society_ids())
  );

CREATE POLICY "channels_insert" ON channels
  FOR INSERT WITH CHECK (
    society_id = ANY(public.auth_admin_society_ids())
  );

-- MESSAGES
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    channel_id IN (
      SELECT id FROM channels WHERE society_id = ANY(public.auth_approved_society_ids())
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = ANY(public.auth_approved_member_ids())
  );

-- LISTINGS
CREATE POLICY "listings_select" ON listings
  FOR SELECT USING (
    society_id = ANY(public.auth_approved_society_ids())
  );

CREATE POLICY "listings_insert" ON listings
  FOR INSERT WITH CHECK (
    author_id = ANY(public.auth_approved_member_ids())
  );

CREATE POLICY "listings_update" ON listings
  FOR UPDATE USING (
    author_id = ANY(public.auth_member_ids())
  );

-- VISITOR PASSES
CREATE POLICY "passes_select" ON visitor_passes
  FOR SELECT USING (
    created_by = ANY(public.auth_approved_member_ids())
    OR society_id = ANY(public.auth_admin_society_ids())
  );

CREATE POLICY "passes_insert" ON visitor_passes
  FOR INSERT WITH CHECK (
    created_by = ANY(public.auth_approved_member_ids())
  );

CREATE POLICY "passes_update" ON visitor_passes
  FOR UPDATE USING (
    society_id = ANY(public.auth_admin_society_ids())
  );

-- COURTS
CREATE POLICY "courts_select" ON courts
  FOR SELECT USING (
    society_id = ANY(public.auth_approved_society_ids())
  );

-- BOOKINGS
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT USING (
    society_id = ANY(public.auth_approved_society_ids())
  );

CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT WITH CHECK (
    member_id = ANY(public.auth_approved_member_ids())
  );

CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE USING (
    member_id = ANY(public.auth_member_ids())
  );

-- NOTIFICATIONS
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (
    member_id = ANY(public.auth_member_ids())
  );

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (
    member_id = ANY(public.auth_member_ids())
  );

-- Notifications insert (for system-generated notifications)
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (
    society_id = ANY(public.auth_approved_society_ids())
  );

-- FEEDBACK
CREATE POLICY "feedback_select" ON feedback
  FOR SELECT USING (
    society_id = ANY(public.auth_approved_society_ids())
  );

CREATE POLICY "feedback_insert" ON feedback
  FOR INSERT WITH CHECK (
    member_id = ANY(public.auth_approved_member_ids())
  );

-- AUDIT LOG
CREATE POLICY "audit_select" ON audit_log
  FOR SELECT USING (
    society_id = ANY(public.auth_admin_society_ids())
  );

CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT WITH CHECK (
    society_id = ANY(public.auth_approved_society_ids())
  );
`;

async function main() {
  console.log('🔧 Connecting to Supabase PostgreSQL...')
  
  // Try pooler connection first (port 6543), then direct (port 5432)
  const configs = [
    {
      label: 'Pooler (Transaction mode)',
      connectionString: `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    },
    {
      label: 'Pooler (Session mode)',
      connectionString: `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`,
    },
    {
      label: 'Direct',
      connectionString: `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`,
    },
  ]

  for (const config of configs) {
    console.log(`  Trying ${config.label}...`)
    const client = new pg.Client({
      connectionString: config.connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })
    
    try {
      await client.connect()
      console.log(`  ✅ Connected via ${config.label}`)
      
      console.log('\n🔄 Applying RLS migration...')
      await client.query(migrationSQL)
      console.log('✅ RLS policies fixed successfully!')
      
      // Verify by testing a query
      const result = await client.query("SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public'")
      console.log(`   ${result.rows[0].policy_count} policies now active`)
      
      await client.end()
      return
    } catch (err) {
      console.log(`  ❌ ${config.label} failed: ${err.message}`)
      try { await client.end() } catch {}
    }
  }

  console.error('\n❌ Could not connect to database with any method.')
  console.error('   Please set SUPABASE_DB_PASSWORD in .env.local with your Supabase database password.')
  console.error('   You can find it in the Supabase dashboard → Settings → Database → Database password')
  console.error('\n   Or paste the migration SQL into the Supabase SQL Editor:')
  console.error('   Dashboard → SQL Editor → New Query')
  process.exit(1)
}

main()
