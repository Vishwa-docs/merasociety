import { NextRequest, NextResponse } from 'next/server'
import { parseBookingIntent } from '@/lib/ai'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

interface CourtRow {
  id: string
  name: string
  sport: string
  slot_duration_minutes: number
  max_daily_hours_per_flat: number
  open_time: string
  close_time: string
}

interface BookingRow {
  id: string
  court_id: string
  date: string
  start_time: string
  end_time: string
  status: string
  member_id: string
}

function resolveDateFromIntent(dateStr: string | null): string {
  const now = new Date()
  if (!dateStr || dateStr === 'today') {
    return now.toISOString().split('T')[0]
  }
  if (dateStr === 'tomorrow') {
    now.setDate(now.getDate() + 1)
    return now.toISOString().split('T')[0]
  }
  // Day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayIndex = days.indexOf(dateStr.toLowerCase())
  if (dayIndex >= 0) {
    const currentDay = now.getDay()
    let daysAhead = dayIndex - currentDay
    if (daysAhead <= 0) daysAhead += 7
    now.setDate(now.getDate() + daysAhead)
    return now.toISOString().split('T')[0]
  }
  return new Date().toISOString().split('T')[0]
}

function resolveTimePreference(pref: string | null): { minHour: number; maxHour: number } {
  if (!pref) return { minHour: 6, maxHour: 22 }
  const lower = pref.toLowerCase()

  if (lower.includes('morning')) return { minHour: 6, maxHour: 12 }
  if (lower.includes('afternoon')) return { minHour: 12, maxHour: 17 }
  if (lower.includes('evening')) return { minHour: 17, maxHour: 22 }
  if (lower.includes('night')) return { minHour: 19, maxHour: 22 }

  // Parse specific time like "6 PM", "after 5", "18:00"
  const afterMatch = lower.match(/after\s+(\d{1,2})\s*(pm|am)?/i)
  if (afterMatch) {
    let hour = parseInt(afterMatch[1])
    if (afterMatch[2]?.toLowerCase() === 'pm' && hour < 12) hour += 12
    return { minHour: hour, maxHour: 22 }
  }

  const timeMatch = lower.match(/(\d{1,2})\s*(pm|am)/i)
  if (timeMatch) {
    let hour = parseInt(timeMatch[1])
    if (timeMatch[2].toLowerCase() === 'pm' && hour < 12) hour += 12
    if (timeMatch[2].toLowerCase() === 'am' && hour === 12) hour = 0
    return { minHour: hour, maxHour: Math.min(hour + 3, 22) }
  }

  const militaryMatch = lower.match(/(\d{1,2}):(\d{2})/)
  if (militaryMatch) {
    const hour = parseInt(militaryMatch[1])
    return { minHour: hour, maxHour: Math.min(hour + 3, 22) }
  }

  return { minHour: 6, maxHour: 22 }
}

function generateSlots(openTime: string, closeTime: string, duration: number) {
  const slots: { start: string; end: string }[] = []
  const [oh, om] = openTime.split(':').map(Number)
  const [ch, cm] = closeTime.split(':').map(Number)
  let cur = oh * 60 + om
  const end = ch * 60 + cm
  while (cur + duration <= end) {
    const sh = Math.floor(cur / 60), sm = cur % 60
    const eh = Math.floor((cur + duration) / 60), em = (cur + duration) % 60
    slots.push({
      start: `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`,
      end: `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`,
    })
    cur += duration
  }
  return slots
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, society_id, member_id } = body

    if (!message || !society_id || !member_id) {
      return NextResponse.json(
        { error: 'Missing required fields: message, society_id, member_id' },
        { status: 400 }
      )
    }

    // Step 1: Parse the booking intent using AI
    let intent
    try {
      intent = await parseBookingIntent(message)
    } catch {
      // Fallback: basic keyword parsing
      const lower = message.toLowerCase()
      intent = {
        sport: lower.includes('badminton') ? 'Badminton' :
               lower.includes('tennis') ? 'Tennis' :
               lower.includes('basketball') ? 'Basketball' :
               lower.includes('table tennis') || lower.includes('tt') ? 'Table Tennis' : null,
        date: lower.includes('tomorrow') ? 'tomorrow' : 'today',
        time_preference: lower.includes('morning') ? 'morning' :
                        lower.includes('evening') ? 'evening' : null,
        duration_hours: 1,
      }
    }

    const resolvedDate = resolveDateFromIntent(intent.date)
    const timePref = resolveTimePreference(intent.time_preference)

    // Step 2: Query available courts
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let courtsQuery = supabase
      .from('courts')
      .select('*')
      .eq('society_id', society_id)
      .eq('is_active', true)

    if (intent.sport) {
      courtsQuery = courtsQuery.ilike('sport', intent.sport)
    }

    const { data: courts, error: courtsError } = await courtsQuery

    if (courtsError) throw courtsError
    if (!courts || courts.length === 0) {
      return NextResponse.json({
        success: false,
        agent_response: intent.sport
          ? `No ${intent.sport} courts found in your society. Available sports may include Badminton, Tennis, Basketball, or Table Tennis.`
          : 'No active courts found in your society.',
        intent,
      })
    }

    // Step 3: Check bookings for the date
    const courtIds = (courts as CourtRow[]).map(c => c.id)
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('*')
      .in('court_id', courtIds)
      .eq('date', resolvedDate)
      .eq('status', 'confirmed')

    const bookings = (existingBookings || []) as BookingRow[]

    // Step 4: Find best available slot
    let bestSlot: { court: CourtRow; slot: { start: string; end: string } } | null = null
    const alternatives: Array<{ court: string; slot: string; sport: string }> = []

    for (const court of courts as CourtRow[]) {
      const slots = generateSlots(court.open_time, court.close_time, court.slot_duration_minutes)
      const courtBookings = bookings.filter(b => b.court_id === court.id)
      const bookedTimes = new Set(courtBookings.map(b => b.start_time))

      // Check member's daily usage on this court
      const memberBookings = courtBookings.filter(b => b.member_id === member_id)
      const memberHours = memberBookings.reduce((sum, b) => {
        const [sh, sm] = b.start_time.split(':').map(Number)
        const [eh, em] = b.end_time.split(':').map(Number)
        return sum + (eh * 60 + em - (sh * 60 + sm)) / 60
      }, 0)

      if (memberHours >= court.max_daily_hours_per_flat) continue

      // Filter slots by time preference and past time
      const now = new Date()
      const isToday = resolvedDate === now.toISOString().split('T')[0]

      for (const slot of slots) {
        const slotHour = parseInt(slot.start.split(':')[0])

        // Skip past slots
        if (isToday) {
          const slotEnd = new Date(`${resolvedDate}T${slot.end}:00`)
          if (slotEnd <= now) continue
        }

        // Skip booked slots
        if (bookedTimes.has(slot.start)) continue

        // Check time preference
        if (slotHour < timePref.minHour || slotHour >= timePref.maxHour) continue

        if (!bestSlot) {
          bestSlot = { court, slot }
        } else {
          alternatives.push({
            court: court.name,
            slot: `${slot.start}-${slot.end}`,
            sport: court.sport,
          })
        }
      }
    }

    if (!bestSlot) {
      // Provide helpful alternatives
      const allAvailable: Array<{ court: string; slot: string; sport: string }> = []
      for (const court of courts as CourtRow[]) {
        const slots = generateSlots(court.open_time, court.close_time, court.slot_duration_minutes)
        const courtBookings = bookings.filter(b => b.court_id === court.id)
        const bookedTimes = new Set(courtBookings.map(b => b.start_time))
        const now = new Date()
        const isToday = resolvedDate === now.toISOString().split('T')[0]

        for (const slot of slots) {
          if (bookedTimes.has(slot.start)) continue
          if (isToday) {
            const slotEnd = new Date(`${resolvedDate}T${slot.end}:00`)
            if (slotEnd <= now) continue
          }
          allAvailable.push({ court: court.name, slot: `${slot.start}-${slot.end}`, sport: court.sport })
          if (allAvailable.length >= 5) break
        }
      }

      return NextResponse.json({
        success: false,
        agent_response: `No slots available matching your preference (${intent.time_preference || 'any time'} on ${resolvedDate}).${
          allAvailable.length > 0
            ? ` Here are some alternatives:\n${allAvailable.map(a => `• ${a.court} (${a.sport}): ${a.slot}`).join('\n')}`
            : ' All slots are booked for this date. Try another day!'
        }`,
        intent,
        alternatives: allAvailable,
      })
    }

    // Step 5: Book the slot
    const { data: booking, error: bookError } = await supabase
      .from('bookings')
      .insert({
        court_id: bestSlot.court.id,
        member_id,
        society_id,
        date: resolvedDate,
        start_time: bestSlot.slot.start,
        end_time: bestSlot.slot.end,
        status: 'confirmed',
      })
      .select('*')
      .single()

    if (bookError) {
      return NextResponse.json({
        success: false,
        agent_response: `Couldn't book the slot — it may have just been taken. Please try again.`,
        intent,
        error: bookError.message,
      })
    }

    const formatTime = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`
    }

    const remainingHours = bestSlot.court.max_daily_hours_per_flat -
      (bookings.filter(b => b.court_id === bestSlot!.court.id && b.member_id === member_id)
        .reduce((sum, b) => {
          const [sh, sm] = b.start_time.split(':').map(Number)
          const [eh, em] = b.end_time.split(':').map(Number)
          return sum + (eh * 60 + em - (sh * 60 + sm)) / 60
        }, 0) + (bestSlot.court.slot_duration_minutes / 60))

    return NextResponse.json({
      success: true,
      agent_response: `✅ **Booked!** ${bestSlot.court.name} (${bestSlot.court.sport}) on ${resolvedDate} from ${formatTime(bestSlot.slot.start)} to ${formatTime(bestSlot.slot.end)}.\n\n📊 **Fairness:** You have ${Math.max(0, remainingHours).toFixed(1)} hours remaining today on this court (max ${bestSlot.court.max_daily_hours_per_flat}h/day per flat).${
        alternatives.length > 0
          ? `\n\n💡 **Other available slots:** ${alternatives.slice(0, 3).map(a => `${a.court} ${a.slot}`).join(', ')}`
          : ''
      }`,
      intent,
      booking,
    })
  } catch (err) {
    console.error('Court booking agent error:', err)
    return NextResponse.json(
      { error: 'Failed to process booking request', success: false },
      { status: 500 }
    )
  }
}
