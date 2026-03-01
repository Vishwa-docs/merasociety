'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
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
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
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

export default function NotificationsPage() {
  const router = useRouter()
  const { currentMember } = useAppStore()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentMember) { setLoading(false); return }
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('member_id', currentMember.id)
          .order('created_at', { ascending: false })
          .limit(30)
        if (!error && data) {
          setNotifications(data as Notification[])
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
        toast.error('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [currentMember])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAllRead = async () => {
    if (!currentMember) return
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('member_id', currentMember.id)
        .eq('is_read', false)
      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        toast.success('All notifications marked as read')
      } else {
        toast.error('Failed to mark notifications as read')
      }
    } catch {
      toast.error('Failed to mark notifications as read')
    }
  }

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        const supabase = createClient()
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notif.id)
      } catch {
        // Silently fail — marking as read is non-critical
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      )
    }
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
