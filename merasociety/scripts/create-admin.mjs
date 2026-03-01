#!/usr/bin/env node

/**
 * Create an admin user for MeraSociety.
 *
 * Reads credentials from .env.local — NO secrets are hardcoded here.
 *
 * Usage:
 *   node scripts/create-admin.mjs <email> <password> <full_name> [flat_number]
 *
 * Example:
 *   node scripts/create-admin.mjs admin@example.com MyPass@123 "John Doe" A-101
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env.local ─────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  try {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    console.error('ERROR: Could not read .env.local — make sure it exists.')
    process.exit(1)
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SOCIETY_ID = '00000000-0000-0000-0000-000000000001'

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local')
  process.exit(1)
}

// ── Parse arguments ─────────────────────────────────────────
const [,, email, password, fullName, flatNumber = 'A-101'] = process.argv

if (!email || !password || !fullName) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password> <full_name> [flat_number]')
  console.error('Example: node scripts/create-admin.mjs admin@example.com Pass@123 "John Doe" A-101')
  process.exit(1)
}

// ── Supabase client ─────────────────────────────────────────
const { createClient } = await import('@supabase/supabase-js')

async function main() {
  console.log('=== MeraSociety Admin Account Setup ===\n')

  // Step 1: Create user via Admin API (preferred) or sign up via anon client
  console.log('1. Creating user account...')

  let userId

  if (SERVICE_KEY) {
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Try to create via admin API (auto-confirms email)
    const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (adminError) {
      if (adminError.message.includes('already') || adminError.message.includes('exists')) {
        console.log('   User already exists — looking up...')
        const { data: listData } = await adminClient.auth.admin.listUsers()
        const existing = listData?.users?.find((u) => u.email === email)
        if (existing) {
          userId = existing.id
        } else {
          console.error('   Could not find existing user')
          process.exit(1)
        }
      } else {
        console.error('   Admin create failed:', adminError.message)
        process.exit(1)
      }
    } else {
      userId = adminData.user.id
    }
  } else {
    // Fallback: sign up via anon client
    const anonClient = createClient(SUPABASE_URL, ANON_KEY)
    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError) {
      if (signUpError.message.includes('already')) {
        console.log('   User already exists — signing in...')
        const { data, error } = await anonClient.auth.signInWithPassword({ email, password })
        if (error) {
          console.error('   Sign-in failed:', error.message)
          process.exit(1)
        }
        userId = data.user.id
      } else {
        console.error('   Signup failed:', signUpError.message)
        process.exit(1)
      }
    } else {
      userId = signUpData?.user?.id
    }
  }

  console.log('   User ID:', userId)

  // Step 2: Confirm email (only needed when using anon client fallback)
  if (!SERVICE_KEY) {
    console.log('\n2. No SUPABASE_SERVICE_ROLE_KEY — confirm email manually in Supabase Dashboard > Auth > Users')
  } else {
    console.log('\n2. Email auto-confirmed via Admin API ✓')
  }

  // Step 3: Ensure member record
  console.log('\n3. Setting up admin member record...')

  // Use service key to bypass RLS, or fall back to anon key
  const client = createClient(
    SUPABASE_URL,
    SERVICE_KEY || ANON_KEY,
    SERVICE_KEY ? { auth: { autoRefreshToken: false, persistSession: false } } : undefined,
  )

  // Check existing member
  const { data: existing } = await client
    .from('members')
    .select('id, role, status')
    .eq('user_id', userId)
    .eq('society_id', SOCIETY_ID)
    .single()

  if (existing) {
    console.log('   Member exists (ID:', existing.id, ')')
    if (existing.role !== 'admin' || existing.status !== 'approved') {
      const { error } = await client
        .from('members')
        .update({ role: 'admin', status: 'approved', is_verified: true })
        .eq('id', existing.id)
      if (error) console.error('   Update failed:', error.message)
      else console.log('   Promoted to admin!')
    } else {
      console.log('   Already admin + approved.')
    }
  } else {
    const { data: member, error } = await client
      .from('members')
      .insert({
        user_id: userId,
        society_id: SOCIETY_ID,
        flat_number: flatNumber,
        full_name: fullName,
        role: 'admin',
        status: 'approved',
        is_verified: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('   Insert failed:', error.message)
      console.log('\n   Run this SQL in the Supabase SQL Editor:')
      console.log(`   INSERT INTO members (user_id, society_id, flat_number, full_name, role, status, is_verified)`)
      console.log(`   VALUES ('${userId}', '${SOCIETY_ID}', '${flatNumber}', '${fullName}', 'admin', 'approved', true);`)
    } else {
      console.log('   Member created (ID:', member?.id, ')')
    }
  }

  console.log('\n========================================')
  console.log('  ACCOUNT READY')
  console.log('========================================')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log('  Role:     Admin')
  console.log('  Society:  Sunrise Heights')
  console.log(`  Flat:     ${flatNumber}`)
  console.log('========================================\n')
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
