'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Trophy,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore, useDemoStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { formatTime, generateTimeSlots } from '@/lib/utils'
import type { Court, Booking, BookingStatus } from '@/lib/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import EmptyState from '@/components/ui/EmptyState'

// Pre-seeded demo courts
const DEMO_COURTS: Court[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'Badminton Court A',
    sport: 'Badminton',
    description: 'Indoor badminton court with professional flooring',
    slot_duration_minutes: 60,
    max_daily_hours_per_flat: 2,
    open_time: '06:00',
    close_time: '22:00',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'Tennis Court',
    sport: 'Tennis',
    description: 'Outdoor tennis court with floodlights',
    slot_duration_minutes: 60,
    max_daily_hours_per_flat: 2,
    open_time: '06:00',
    close_time: '21:00',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'Basketball Court',
    sport: 'Basketball',
    description: 'Full-size outdoor basketball court',
    slot_duration_minutes: 60,
    max_daily_hours_per_flat: 2,
    open_time: '06:00',
    close_time: '21:00',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000104',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'Table Tennis',
    sport: 'Table Tennis',
    description: 'Indoor table tennis room with 2 tables',
    slot_duration_minutes: 30,
    max_daily_hours_per_flat: 2,
    open_time: '07:00',
    close_time: '22:00',
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

const sportEmoji: Record<string, string> = {
  Badminton: '🏸',
  Tennis: '🎾',
  Basketball: '🏀',
  'Table Tennis': '🏓',
}

function getDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow'

  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function isSlotPast(date: string, endTime: string): boolean {
  const now = new Date()
  const slotEnd = new Date(`${date}T${endTime}:00`)
  return slotEnd <= now
}

export default function SportsPage() {
  const { currentMember, currentSociety, isDemoMode } = useAppStore()
  const demoStore = useDemoStore()

  const [courts, setCourts] = useState<Court[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [selectedDate, setSelectedDate] = useState(getDateOffset(0))
  const [loading, setLoading] = useState(true)

  // Booking modal
  const [bookingSlot, setBookingSlot] = useState<{
    start: string
    end: string
  } | null>(null)
  const [confirming, setConfirming] = useState(false)

  // Fetch courts + bookings
  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      if (isDemoMode) {
        if (!demoStore.initialized) demoStore.initialize()
        setCourts(DEMO_COURTS)
        setBookings(demoStore.bookings as unknown as Booking[])
        setSelectedCourt(DEMO_COURTS[0])
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const societyId = currentSociety?.id
        if (!societyId) return

        const [courtsRes, bookingsRes] = await Promise.all([
          supabase
            .from('courts')
            .select('*')
            .eq('society_id', societyId)
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('bookings')
            .select(`
              *,
              member:members!member_id(full_name, flat_number),
              court:courts!court_id(name, sport)
            `)
            .eq('society_id', societyId)
            .in('status', ['confirmed', 'completed']),
        ])

        if (courtsRes.error) throw courtsRes.error
        if (bookingsRes.error) throw bookingsRes.error

        const fetchedCourts = (courtsRes.data || []) as Court[]
        setCourts(fetchedCourts)
        setBookings((bookingsRes.data || []) as Booking[])
        if (fetchedCourts.length > 0) setSelectedCourt(fetchedCourts[0])
      } catch (err) {
        console.error('Failed to fetch sports data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isDemoMode, currentSociety?.id, demoStore])

  // Bookings for the selected court + date
  const dayBookings = useMemo(() => {
    if (!selectedCourt) return []
    return bookings.filter(
      (b) =>
        b.court_id === selectedCourt.id &&
        b.date === selectedDate &&
        b.status !== 'cancelled'
    )
  }, [bookings, selectedCourt, selectedDate])

  // Time slots
  const slots = useMemo(() => {
    if (!selectedCourt) return []
    return generateTimeSlots(
      selectedCourt.open_time,
      selectedCourt.close_time,
      selectedCourt.slot_duration_minutes
    )
  }, [selectedCourt])

  // My hours today
  const myHoursToday = useMemo(() => {
    if (!selectedCourt || !currentMember) return 0
    const myBookings = bookings.filter(
      (b) =>
        b.court_id === selectedCourt.id &&
        b.date === selectedDate &&
        b.member_id === currentMember.id &&
        b.status !== 'cancelled'
    )
    return myBookings.reduce((sum, b) => {
      const [sh, sm] = b.start_time.split(':').map(Number)
      const [eh, em] = b.end_time.split(':').map(Number)
      return sum + (eh * 60 + em - (sh * 60 + sm)) / 60
    }, 0)
  }, [bookings, selectedCourt, selectedDate, currentMember])

  const maxHours = selectedCourt?.max_daily_hours_per_flat || 2
  const overLimit = myHoursToday >= maxHours

  // Get slot status
  const getSlotStatus = useCallback(
    (slot: { start: string; end: string }) => {
      const booking = dayBookings.find(
        (b) => b.start_time === slot.start && b.end_time === slot.end
      )
      if (booking) {
        const isMe = booking.member_id === currentMember?.id
        const member = booking.member as
          | { full_name: string; flat_number: string }
          | undefined
        return {
          status: isMe ? ('mine' as const) : ('booked' as const),
          booking,
          bookerName: member?.full_name || 'Someone',
          bookerFlat: member?.flat_number || '',
        }
      }
      if (isSlotPast(selectedDate, slot.end)) {
        return { status: 'past' as const }
      }
      return { status: 'available' as const }
    },
    [dayBookings, selectedDate, currentMember]
  )

  // Confirm booking
  const handleConfirmBooking = useCallback(async () => {
    if (!bookingSlot || !selectedCourt || !currentMember) return
    setConfirming(true)

    const bookingData = {
      court_id: selectedCourt.id,
      member_id: currentMember.id,
      society_id:
        currentSociety?.id || '00000000-0000-0000-0000-000000000001',
      date: selectedDate,
      start_time: bookingSlot.start,
      end_time: bookingSlot.end,
      status: 'confirmed' as const,
      created_at: new Date().toISOString(),
    }

    try {
      if (isDemoMode) {
        const newBooking: Booking = {
          id: `demo-booking-${Date.now()}`,
          ...bookingData,
          member: {
            id: currentMember.id,
            full_name: currentMember.full_name,
            flat_number: currentMember.flat_number,
          } as Booking['member'],
          court: {
            id: selectedCourt.id,
            name: selectedCourt.name,
            sport: selectedCourt.sport,
          } as Booking['court'],
        }
        setBookings((prev) => [...prev, newBooking])
        demoStore.addItem('bookings', newBooking as unknown as Record<string, unknown>)
      } else {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select(`
            *,
            member:members!member_id(full_name, flat_number),
            court:courts!court_id(name, sport)
          `)
          .single()

        if (error) throw error
        setBookings((prev) => [...prev, data as Booking])
      }

      toast.success('Court booked!')
      setBookingSlot(null)
    } catch (err) {
      console.error('Failed to book:', err)
      toast.error('Failed to book court')
    } finally {
      setConfirming(false)
    }
  }, [
    bookingSlot,
    selectedCourt,
    selectedDate,
    currentMember,
    currentSociety,
    isDemoMode,
    demoStore,
  ])

  // Cancel booking
  const handleCancelBooking = useCallback(
    async (bookingId: string) => {
      if (!confirm('Cancel this booking?')) return

      if (isDemoMode) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? { ...b, status: 'cancelled' as BookingStatus }
              : b
          )
        )
        toast.success('Booking cancelled')
        return
      }

      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', bookingId)

        if (error) throw error
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? { ...b, status: 'cancelled' as BookingStatus }
              : b
          )
        )
        toast.success('Booking cancelled')
      } catch {
        toast.error('Failed to cancel')
      }
    },
    [isDemoMode]
  )

  // My bookings split
  const myBookings = useMemo(() => {
    if (!currentMember) return { upcoming: [], past: [] }
    const mine = bookings.filter(
      (b) => b.member_id === currentMember.id && b.status !== 'cancelled'
    )
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const upcoming = mine.filter((b) => {
      if (b.date > today) return true
      if (b.date === today) {
        const end = new Date(`${b.date}T${b.end_time}:00`)
        return end > now
      }
      return false
    })
    const past = mine.filter((b) => {
      if (b.date < today) return true
      if (b.date === today) {
        const end = new Date(`${b.date}T${b.end_time}:00`)
        return end <= now
      }
      return false
    })
    return {
      upcoming: upcoming.sort(
        (a, b) =>
          new Date(`${a.date}T${a.start_time}`).getTime() -
          new Date(`${b.date}T${b.start_time}`).getTime()
      ),
      past: past.sort(
        (a, b) =>
          new Date(`${b.date}T${b.start_time}`).getTime() -
          new Date(`${a.date}T${a.start_time}`).getTime()
      ),
    }
  }, [bookings, currentMember])

  // Date navigation
  const dateRange = useMemo(() => {
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      dates.push(getDateOffset(i))
    }
    return dates
  }, [])

  // Slot grid content
  const slotGridContent = (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {dateRange.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            className={`flex flex-col items-center px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150 ${
              selectedDate === d
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="text-xs">
              {formatDateLabel(d).split(' ')[0]}
            </span>
            <span className="text-base font-bold">
              {new Date(d + 'T00:00:00').getDate()}
            </span>
          </button>
        ))}
      </div>

      {/* Fairness indicator */}
      <div className="bg-gray-50 rounded-xl p-3">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-gray-600">
            Your usage today:{' '}
            <span className="font-semibold text-gray-900">
              {myHoursToday}h
            </span>{' '}
            of {maxHours}h
          </span>
          {overLimit && (
            <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Limit reached
            </span>
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              overLimit ? 'bg-amber-500' : 'bg-teal-500'
            }`}
            style={{
              width: `${Math.min(100, (myHoursToday / maxHours) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Time slot grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {slots.map((slot) => {
          const info = getSlotStatus(slot)
          let bg = ''
          let text = ''
          let clickable = false

          switch (info.status) {
            case 'available':
              bg = overLimit
                ? 'bg-gray-100 border-gray-200'
                : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
              text = overLimit ? 'text-gray-400' : 'text-green-700'
              clickable = !overLimit
              break
            case 'booked':
              bg = 'bg-red-50 border-red-200'
              text = 'text-red-700'
              break
            case 'mine':
              bg = 'bg-teal-50 border-teal-300'
              text = 'text-teal-700'
              break
            case 'past':
              bg = 'bg-gray-50 border-gray-200'
              text = 'text-gray-400'
              break
          }

          return (
            <button
              key={slot.start}
              disabled={!clickable}
              onClick={() => clickable && setBookingSlot(slot)}
              className={`relative p-3 rounded-xl border-2 transition-all duration-150 text-left ${bg} ${
                clickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className={`text-sm font-semibold ${text}`}>
                {formatTime(slot.start)}
              </div>
              <div className={`text-xs ${text} opacity-70`}>
                to {formatTime(slot.end)}
              </div>
              {(info.status === 'booked' || info.status === 'mine') && (
                <div className={`text-xs mt-1 truncate ${text} opacity-60`}>
                  {info.status === 'mine'
                    ? 'You'
                    : `${(info as { bookerName: string }).bookerName}`}
                  {info.status === 'booked' &&
                    (info as { bookerFlat: string }).bookerFlat &&
                    ` · ${(info as { bookerFlat: string }).bookerFlat}`}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {slots.length === 0 && selectedCourt && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No time slots available for this court.
        </div>
      )}
    </div>
  )

  // My bookings content
  const myBookingsContent = (
    <div className="space-y-6">
      {/* Upcoming */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-teal-600" />
          Upcoming ({myBookings.upcoming.length})
        </h3>
        {myBookings.upcoming.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">
            No upcoming bookings
          </div>
        ) : (
          <div className="space-y-2">
            {myBookings.upcoming.map((b) => {
              const court = b.court as
                | { name: string; sport: string }
                | undefined
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {sportEmoji[court?.sport || ''] || '🏅'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {court?.name || 'Court'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateLabel(b.date)} · {formatTime(b.start_time)} –{' '}
                        {formatTime(b.end_time)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelBooking(b.id)}
                    icon={<X className="h-3.5 w-3.5" />}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Past */}
      {myBookings.past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">
            Past ({myBookings.past.length})
          </h3>
          <div className="space-y-2">
            {myBookings.past.slice(0, 10).map((b) => {
              const court = b.court as
                | { name: string; sport: string }
                | undefined
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl opacity-60"
                >
                  <span className="text-xl">
                    {sportEmoji[court?.sport || ''] || '🏅'}
                  </span>
                  <div>
                    <div className="font-medium text-gray-700 text-sm">
                      {court?.name || 'Court'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDateLabel(b.date)} · {formatTime(b.start_time)} –{' '}
                      {formatTime(b.end_time)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {myBookings.upcoming.length === 0 && myBookings.past.length === 0 && (
        <EmptyState
          icon={<Trophy />}
          title="No bookings yet"
          description="Select a court and book a time slot to get started."
        />
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-teal-600" />
          Sports Court Booking
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Book courts and manage your reservations
        </p>
      </div>

      {/* Court selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {courts.map((court) => (
          <button
            key={court.id}
            onClick={() => setSelectedCourt(court)}
            className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-150 ${
              selectedCourt?.id === court.id
                ? 'border-teal-500 bg-teal-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <span className="text-3xl">
              {sportEmoji[court.sport] || '🏅'}
            </span>
            <span
              className={`text-sm font-semibold text-center ${
                selectedCourt?.id === court.id
                  ? 'text-teal-700'
                  : 'text-gray-900'
              }`}
            >
              {court.name}
            </span>
            <span className="text-xs text-gray-500">{court.sport}</span>
          </button>
        ))}
      </div>

      {courts.length === 0 && (
        <EmptyState
          icon={<Trophy />}
          title="No courts available"
          description="No sports courts have been set up for this society yet."
        />
      )}

      {/* Tabs: Schedule / My Bookings */}
      {selectedCourt && (
        <Tabs
          tabs={[
            {
              id: 'schedule',
              label: 'Schedule',
              icon: <Calendar className="h-4 w-4" />,
              content: slotGridContent,
            },
            {
              id: 'my-bookings',
              label: 'My Bookings',
              icon: <Clock className="h-4 w-4" />,
              content: myBookingsContent,
            },
          ]}
          defaultTab="schedule"
        />
      )}

      {/* Booking confirmation modal */}
      <Modal
        open={!!bookingSlot}
        onClose={() => setBookingSlot(null)}
        title="Confirm Booking"
        size="sm"
      >
        {bookingSlot && selectedCourt && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-xl">
              <span className="text-4xl">
                {sportEmoji[selectedCourt.sport] || '🏅'}
              </span>
              <div>
                <div className="font-semibold text-gray-900">
                  {selectedCourt.name}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedCourt.description}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Date</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDateLabel(selectedDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Time</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatTime(bookingSlot.start)} –{' '}
                    {formatTime(bookingSlot.end)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="secondary"
                onClick={() => setBookingSlot(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBooking}
                loading={confirming}
                className="flex-1"
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
