import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Public endpoint to search/browse societies.
 * No auth required — allows new users to find their apartment.
 *
 * GET /api/societies?q=sunrise
 * GET /api/societies (returns all)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    const supabase = await createClient()

    let dbQuery = supabase
      .from('societies')
      .select('id, name, address, created_at')
      .order('name')

    if (query) {
      // Search by name or address (case-insensitive)
      dbQuery = dbQuery.or(`name.ilike.%${query}%,address.ilike.%${query}%`)
    }

    const { data, error } = await dbQuery

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return societies without invite codes (users must get code from their admin)
    const societies = (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      created_at: s.created_at,
    }))

    return NextResponse.json({ societies })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
