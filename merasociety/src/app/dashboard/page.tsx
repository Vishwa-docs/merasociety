'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import {
  Users,
  ShoppingBag,
  Shield,
  Trophy,
  Bell,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Loader2,
} from 'lucide-react'

const quickActions = [
  {
    label: 'New Announcement',
    href: '/dashboard/announcements',
    icon: Bell,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    label: 'Create Pass',
    href: '/dashboard/security',
    icon: Shield,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    label: 'Book Court',
    href: '/dashboard/sports',
    icon: Trophy,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    label: 'Post Listing',
    href: '/dashboard/bazaar',
    icon: Plus,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
]

interface DashboardStats {
  members: number
  listings: number
  pendingPasses: number
  todayBookings: number
}

interface ActivityItem {
  id: string
  text: string
  time: string
  type: string
}

export default function DashboardPage() {
  const currentMember = useAppStore((s) => s.currentMember)
  const currentSociety = useAppStore((s) => s.currentSociety)
  const [stats, setStats] = useState<DashboardStats>({ members: 0, listings: 0, pendingPasses: 0, todayBookings: 0 })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [adminPending, setAdminPending] = useState({ approvals: 0, passes: 0 })
  const [loading, setLoading] = useState(true)

  const firstName = currentMember?.full_name?.split(' ')[0] || 'User'

  useEffect(() => {
    async function fetchDashboard() {
      if (!currentSociety) { setLoading(false); return }
      try {
        const supabase = createClient()
        const sid = currentSociety.id
        const today = new Date().toISOString().split('T')[0]

        const [membersRes, listingsRes, passesRes, bookingsRes] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact', head: true }).eq('society_id', sid).eq('status', 'approved'),
          supabase.from('listings').select('id', { count: 'exact', head: true }).eq('society_id', sid).eq('status', 'active'),
          supabase.from('visitor_passes').select('id', { count: 'exact', head: true }).eq('society_id', sid).eq('status', 'active'),
          supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('society_id', sid).eq('date', today),
        ])

        setStats({
          members: membersRes.count ?? 0,
          listings: listingsRes.count ?? 0,
          pendingPasses: passesRes.count ?? 0,
          todayBookings: bookingsRes.count ?? 0,
        })

        // Recent activity from audit_log
        const { data: auditData } = await supabase
          .from('audit_log')
          .select('id, action, entity_type, created_at')
          .eq('society_id', sid)
          .order('created_at', { ascending: false })
          .limit(5)

        if (auditData) {
          setActivity(auditData.map((a) => ({
            id: a.id,
            text: a.action,
            time: formatDate(a.created_at),
            type: a.entity_type || 'general',
          })))
        }

        // Admin counts
        if (currentMember?.role === 'admin') {
          const [pendingMembers, pendingPassesAdmin] = await Promise.all([
            supabase.from('members').select('id', { count: 'exact', head: true }).eq('society_id', sid).eq('status', 'pending'),
            supabase.from('visitor_passes').select('id', { count: 'exact', head: true }).eq('society_id', sid).eq('status', 'pending'),
          ])
          setAdminPending({
            approvals: pendingMembers.count ?? 0,
            passes: pendingPassesAdmin.count ?? 0,
          })
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [currentSociety, currentMember])

  const statCards = [
    { label: 'Total Members', value: stats.members, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Listings', value: stats.listings, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active Passes', value: stats.pendingPasses, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: "Today's Bookings", value: stats.todayBookings, icon: Trophy, color: 'text-teal-600', bg: 'bg-teal-50' },
  ]

  const activityIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Bell className="h-4 w-4 text-amber-500" />
      case 'listing': return <ShoppingBag className="h-4 w-4 text-purple-500" />
      case 'visitor_pass': return <Shield className="h-4 w-4 text-green-500" />
      case 'booking': return <Trophy className="h-4 w-4 text-teal-500" />
      default: return <Bell className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName}!
        </h1>
        <p className="mt-1 text-gray-500">
          Here&apos;s what&apos;s happening in{' '}
          <span className="font-medium text-gray-700">
            {currentSociety?.name || 'your society'}
          </span>{' '}
          today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.bg} rounded-xl p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card header="Quick Actions" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-4 text-center hover:bg-gray-50 hover:border-gray-200 transition-colors cursor-pointer">
                  <div className={`${action.bg} rounded-xl p-2.5`}>
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {action.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card
          header="Recent Activity"
          className="lg:col-span-2"
          footer={
            <Link
              href="/dashboard/announcements"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              View all activity
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No recent activity</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="mt-0.5 shrink-0">
                    {activityIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">{item.text}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Admin Tip (if admin) */}
      {currentMember?.role === 'admin' && (adminPending.approvals > 0 || adminPending.passes > 0) && (
        <Card className="border-teal-200 bg-teal-50/50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-100 p-2.5">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-teal-900">Admin Tip</p>
              <p className="text-sm text-teal-700">
                You have {adminPending.approvals} pending member approval{adminPending.approvals !== 1 ? 's' : ''} and {adminPending.passes} security pass request{adminPending.passes !== 1 ? 's' : ''}.
              </p>
            </div>
            <Button variant="primary" size="sm">
              <Link href="/dashboard/admin">Review</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
