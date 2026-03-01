import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SEED_SOCIETY_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get the authenticated user's member record to use as author
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to seed data. Sign in first, then visit /api/seed' },
        { status: 401 }
      )
    }

    const { data: currentMember } = await supabase
      .from('members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()

    if (!currentMember) {
      return NextResponse.json(
        { error: 'No approved member record found for your account.' },
        { status: 403 }
      )
    }

    if (currentMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can seed data.' },
        { status: 403 }
      )
    }

    const authorId = currentMember.id
    const results: Record<string, number> = {}

    // 1. Create seed society
    const { error: societyError } = await supabase
      .from('societies')
      .upsert(
        {
          id: SEED_SOCIETY_ID,
          name: 'Sunrise Heights',
          address: '42, MG Road, Sector 15, Gurugram',
          invite_code: 'SUNRISE24',
          settings: { max_passes_per_day: 5, maintenance_amount: 3500 },
        },
        { onConflict: 'id' }
      )
    if (societyError) throw societyError
    results.societies = 1

    // 2. Create seed courts
    const courts = [
      {
        id: '00000000-0000-0000-0000-000000000101',
        society_id: SEED_SOCIETY_ID,
        name: 'Badminton Court A',
        sport: 'badminton',
        description: 'Indoor badminton court with wooden flooring',
        slot_duration_minutes: 60,
        max_daily_hours_per_flat: 2,
        open_time: '06:00',
        close_time: '22:00',
        is_active: true,
      },
      {
        id: '00000000-0000-0000-0000-000000000102',
        society_id: SEED_SOCIETY_ID,
        name: 'Tennis Court',
        sport: 'tennis',
        description: 'Outdoor hard court with floodlights',
        slot_duration_minutes: 60,
        max_daily_hours_per_flat: 2,
        open_time: '06:00',
        close_time: '21:00',
        is_active: true,
      },
      {
        id: '00000000-0000-0000-0000-000000000103',
        society_id: SEED_SOCIETY_ID,
        name: 'Table Tennis Room',
        sport: 'table_tennis',
        description: 'Air-conditioned room with 2 tables',
        slot_duration_minutes: 30,
        max_daily_hours_per_flat: 1,
        open_time: '07:00',
        close_time: '22:00',
        is_active: true,
      },
      {
        id: '00000000-0000-0000-0000-000000000104',
        society_id: SEED_SOCIETY_ID,
        name: 'Basketball Half Court',
        sport: 'basketball',
        description: 'Outdoor half court near parking area',
        slot_duration_minutes: 60,
        max_daily_hours_per_flat: 2,
        open_time: '06:00',
        close_time: '20:00',
        is_active: true,
      },
    ]

    const { error: courtsError } = await supabase
      .from('courts')
      .upsert(courts, { onConflict: 'id' })
    if (courtsError) throw courtsError
    results.courts = courts.length

    // 3. Create seed channels
    const channels = [
      {
        id: '00000000-0000-0000-0000-000000000201',
        society_id: SEED_SOCIETY_ID,
        name: 'general',
        description: 'General discussion for all residents',
        type: 'general',
      },
      {
        id: '00000000-0000-0000-0000-000000000202',
        society_id: SEED_SOCIETY_ID,
        name: 'buy-sell',
        description: 'Buy and sell items within the society',
        type: 'topic',
      },
      {
        id: '00000000-0000-0000-0000-000000000203',
        society_id: SEED_SOCIETY_ID,
        name: 'maintenance',
        description: 'Maintenance issues and requests',
        type: 'topic',
      },
      {
        id: '00000000-0000-0000-0000-000000000204',
        society_id: SEED_SOCIETY_ID,
        name: 'events',
        description: 'Society events and celebrations',
        type: 'topic',
      },
      {
        id: '00000000-0000-0000-0000-000000000205',
        society_id: SEED_SOCIETY_ID,
        name: 'parking',
        description: 'Parking related discussions and issues',
        type: 'topic',
      },
      {
        id: '00000000-0000-0000-0000-000000000206',
        society_id: SEED_SOCIETY_ID,
        name: 'pets',
        description: 'Pet owners corner',
        type: 'topic',
      },
    ]

    const { error: channelsError } = await supabase
      .from('channels')
      .upsert(channels, { onConflict: 'id' })
    if (channelsError) throw channelsError
    results.channels = channels.length

    // 4. Create sample announcements (authored by the current admin)
    const announcements = [
      {
        id: '00000000-0000-0000-0000-000000000401',
        society_id: SEED_SOCIETY_ID,
        author_id: authorId,
        title: '🚰 Water Supply Disruption - Scheduled Maintenance',
        content: 'Dear residents, the municipal corporation has informed us of a scheduled water supply disruption on February 28th from 10 AM to 4 PM. Please store adequate water. Tanker backup has been arranged.',
        is_pinned: true,
        priority: 'urgent',
      },
      {
        id: '00000000-0000-0000-0000-000000000402',
        society_id: SEED_SOCIETY_ID,
        author_id: authorId,
        title: '🎉 Annual Society Day Celebration',
        content: 'We are excited to announce the Annual Sunrise Heights Society Day on March 15th! Events include fun games for kids, cultural programs, food stalls, and a DJ night. Flat contributions: ₹500 per flat.',
        is_pinned: false,
        priority: 'normal',
      },
      {
        id: '00000000-0000-0000-0000-000000000403',
        society_id: SEED_SOCIETY_ID,
        author_id: authorId,
        title: '🏗️ Lift Maintenance Schedule',
        content: 'Lift B will undergo routine maintenance on March 1st between 9 AM and 1 PM. Please use Lift A or the staircase during this period.',
        is_pinned: false,
        priority: 'high',
      },
      {
        id: '00000000-0000-0000-0000-000000000404',
        society_id: SEED_SOCIETY_ID,
        author_id: authorId,
        title: '🔒 New Security Protocol',
        content: 'Starting March 1st, all visitors must have a pre-approved digital pass via MeraSociety app. Guards will verify the pass code at the gate.',
        is_pinned: true,
        priority: 'high',
      },
    ]

    const { error: annError } = await supabase
      .from('announcements')
      .upsert(announcements, { onConflict: 'id' })
    if (annError) throw annError
    results.announcements = announcements.length

    // 5. Create sample listings
    const listings = [
      {
        id: '00000000-0000-0000-0000-000000000501',
        society_id: SEED_SOCIETY_ID,
        author_id: authorId,
        title: 'Samsung 7kg Washing Machine',
        description: '2 year old Samsung front-load washing machine. Works perfectly, selling because upgrading.',
        category: 'buy_sell',
        price: 8000,
        images: [],
        tags: ['electronics', 'washing-machine', 'samsung'],
        status: 'active',
      },
      {
        id: '00000000-0000-0000-0000-000000000502',
        society_id: SEED_SOCIETY_ID,
        author_id: authorId,
        title: 'Experienced Cook Available',
        description: 'Our cook Lakshmi is available for 2 more households. Excellent South Indian and North Indian food.',
        category: 'services',
        price: 4000,
        images: [],
        tags: ['cook', 'south-indian', 'north-indian'],
        status: 'active',
      },
      {
        id: '00000000-0000-0000-0000-000000000503',
        society_id: SEED_SOCIETY_ID,
        author_id: authorId,
        title: 'Homemade Rajasthani Thali - Weekend Special',
        description: 'This weekend: Dal Baati Churma, Gatte ki Sabzi, Ker Sangri, Mirchi Vada, and Ghevar!',
        category: 'food',
        price: 200,
        images: [],
        tags: ['homemade', 'rajasthani', 'thali'],
        status: 'active',
      },
      {
        id: '00000000-0000-0000-0000-000000000504',
        society_id: SEED_SOCIETY_ID,
        author_id: authorId,
        title: 'IKEA Study Table + Chair',
        description: 'IKEA BEKANT desk (120x80cm) with MARKUS office chair. Both in excellent condition, 1 year old.',
        category: 'buy_sell',
        price: 12000,
        images: [],
        tags: ['furniture', 'ikea', 'desk', 'chair'],
        status: 'active',
      },
      {
        id: '00000000-0000-0000-0000-000000000505',
        society_id: SEED_SOCIETY_ID,
        author_id: authorId,
        title: 'Reliable Plumber Recommendation',
        description: 'Recommending Raju Plumber - very skilled, reasonable rates, comes on time. 5 years experience in our society.',
        category: 'services',
        price: null,
        images: [],
        tags: ['plumber', 'recommendation', 'maintenance'],
        status: 'active',
      },
    ]

    const { error: listingsError } = await supabase
      .from('listings')
      .upsert(listings, { onConflict: 'id' })
    if (listingsError) throw listingsError
    results.listings = listings.length

    // 6. Create sample notifications for the admin
    const notifications = [
      {
        society_id: SEED_SOCIETY_ID,
        member_id: authorId,
        title: 'Welcome to MeraSociety!',
        body: 'Your admin account is active. Start by exploring the dashboard and inviting residents.',
        type: 'info',
        is_read: false,
      },
      {
        society_id: SEED_SOCIETY_ID,
        member_id: authorId,
        title: 'Maintenance Payment Due',
        body: 'Monthly maintenance of ₹3,500 is due by March 5th.',
        type: 'reminder',
        is_read: false,
      },
      {
        society_id: SEED_SOCIETY_ID,
        member_id: authorId,
        title: 'New Security Protocol Active',
        body: 'Digital visitor passes are now mandatory. Share the app with your society members.',
        type: 'info',
        is_read: false,
      },
    ]

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)
    if (notifError) console.warn('Notifications insert warning:', notifError.message)
    else results.notifications = notifications.length

    // 7. Create sample audit log entries
    const auditEntries = [
      {
        society_id: SEED_SOCIETY_ID,
        member_id: authorId,
        action: 'society_created',
        entity_type: 'society',
        entity_id: SEED_SOCIETY_ID,
        details: { name: 'Sunrise Heights' },
      },
      {
        society_id: SEED_SOCIETY_ID,
        member_id: authorId,
        action: 'announcement_created',
        entity_type: 'announcement',
        details: { title: 'Water Supply Disruption' },
      },
      {
        society_id: SEED_SOCIETY_ID,
        member_id: authorId,
        action: 'listing_created',
        entity_type: 'listing',
        details: { title: 'Samsung Washing Machine' },
      },
      {
        society_id: SEED_SOCIETY_ID,
        member_id: authorId,
        action: 'channel_created',
        entity_type: 'channel',
        details: { name: 'General' },
      },
    ]

    const { error: auditError } = await supabase
      .from('audit_log')
      .insert(auditEntries)
    if (auditError) console.warn('Audit log insert warning:', auditError.message)
    else results.audit_log = auditEntries.length

    // 8. Create a sample chat message in General channel
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        channel_id: '00000000-0000-0000-0000-000000000201',
        sender_id: authorId,
        content: 'Welcome to Sunrise Heights community chat! Feel free to introduce yourself here. 👋',
      })
    if (msgError) console.warn('Message insert warning:', msgError.message)
    else results.messages = 1

    return NextResponse.json({
      success: true,
      message: 'Sample data seeded successfully!',
      summary: results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during seeding'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
