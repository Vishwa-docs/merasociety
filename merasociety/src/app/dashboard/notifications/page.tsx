'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BellOff,
  Megaphone,
  ShieldCheck,
  MessageSquare,
  ShoppingBag,
  CalendarCheck,
  CheckCheck,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore, useDemoStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Notification } from '@/lib/types'

function getNotifIcon(type: string) {
  switch (type) {
    case 'announcement': return <Megaphone className="h-5 w-5" />
    case 'security': return <ShieldCheck className="h-5 w-5" />
    case 'chat': return <MessageSquare className="h-5 w-5" />
    case 'bazaar': return <ShoppingBag className="h-5 w-5" />
    case 'booking': return <CalendarCheck className="h-5 w-5" />
    default: return <Info className="h-5 w-5" />
  }
}

function getNotifIconColor(type: string) {
  switch (type) {
    case 'announcement': return 'text-blue-600 bg-blue-50'
    case 'security': return 'text-green-600 bg-green-50'
    case 'chat': return 'text-purple-600 bg-purple-50'
    case 'bazaar': return 'text-orange-600 bg-orange-50'
    case 'booking': return 'text-teal-600 bg-teal-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

const EXTRA_DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'demo-notif-3',
    member_id: 'demo-member-2',
    society_id: '00000000-0000-0000-0000-000000000001',
    title: 'New message in #general',
    body: 'Meena Rathore: Weekend Rajasthani thali orders open!',
    type: 'chat',
    is_read: false,
    link: '/dashboard/chat',
    created_at: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'demo-notif-4',
    member_id: 'demo-member-2',
    society_id: '00000000-0000-0000-0000-000000000001',
    title: 'Court booking confirmed',
    body: 'Your badminton court booking for 6:00 PM today is confirmed.',
    type: 'booking',
    is_read: false,
    link: '/dashboard/sports',
    created_at: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 'demo-notif-5',
    member_id: 'demo-member-2',
    society_id: '00000000-0000-0000-0000-000000000001',
    title: 'New listing in Bazaar',
    body: 'IKEA Study Table + Chair listed by Vikram Singh (D-103)',
    type: 'bazaar',
    is_read: true,
    link: '/dashboard/bazaar',
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
]

export default function NotificationsPage() {
  const router = useRouter()
  const { isDemoMode } = useAppStore()
  const demoStore = useDemoStore()

  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (isDemoMode) {
      demoStore.initialize()
      // Merge demo store notifications with extra ones
      const storeNotifs = (demoStore.notifications || []) as unknown as Notification[]
      const merged = [...storeNotifs, ...EXTRA_DEMO_NOTIFICATIONS]
      // Deduplicate by id
      const seen = new Set<string>()
      const deduped = merged.filter((n) => {
        if (seen.has(n.id)) return false
        seen.add(n.id)
        return true
      })
      // Sort newest first
      deduped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNotifications(deduped)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    toast.success('All notifications marked as read')
  }

  const handleClick = (notif: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    )
    if (notif.link) {
      router.push(notif.link)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You\u2019re all caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCheck className="h-4 w-4" />}
            onClick={handleMarkAllRead}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff />}
          title="No notifications"
          description="You don't have any notifications yet. They'll appear here when something happens."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-150 cursor-pointer hover:shadow-sm ${
                notif.is_read
                  ? 'bg-white border-gray-100'
                  : 'bg-teal-50/30 border-l-4 border-l-teal-500 border-t border-r border-b border-t-gray-100 border-r-gray-100 border-b-gray-100'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${getNotifIconColor(notif.type)}`}>
                {getNotifIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm ${notif.is_read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                    {notif.title}
                  </h3>
                  {!notif.is_read && (
                    <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                  )}
                </div>
                {notif.body && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{formatDate(notif.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
