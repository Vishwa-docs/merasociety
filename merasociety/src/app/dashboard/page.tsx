'use client'

import { useAppStore } from '@/lib/store'
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
  CalendarDays,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react'

const stats = [
  {
    label: 'Total Members',
    value: '64',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    trend: '+3 this month',
  },
  {
    label: 'Active Listings',
    value: '12',
    icon: ShoppingBag,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    trend: '5 new this week',
  },
  {
    label: 'Pending Passes',
    value: '3',
    icon: Shield,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    trend: 'Awaiting approval',
  },
  {
    label: "Today's Bookings",
    value: '5',
    icon: Trophy,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    trend: '2 tennis, 3 gym',
  },
]

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

const recentActivity = [
  {
    id: 1,
    text: 'Water supply disruption notice posted',
    time: '1 hour ago',
    type: 'announcement',
    icon: Bell,
    iconColor: 'text-amber-500',
  },
  {
    id: 2,
    text: 'Priya Sharma listed "Study Table" in Bazaar',
    time: '2 hours ago',
    type: 'listing',
    icon: ShoppingBag,
    iconColor: 'text-purple-500',
  },
  {
    id: 3,
    text: 'Guest pass approved for Flat B-204',
    time: '3 hours ago',
    type: 'security',
    icon: Shield,
    iconColor: 'text-green-500',
  },
  {
    id: 4,
    text: 'Tennis court booked for 6 PM',
    time: '4 hours ago',
    type: 'booking',
    icon: CalendarDays,
    iconColor: 'text-teal-500',
  },
  {
    id: 5,
    text: 'Monthly maintenance meeting scheduled',
    time: '5 hours ago',
    type: 'announcement',
    icon: Bell,
    iconColor: 'text-amber-500',
  },
]

export default function DashboardPage() {
  const currentMember = useAppStore((s) => s.currentMember)
  const currentSociety = useAppStore((s) => s.currentSociety)

  const firstName = currentMember?.full_name?.split(' ')[0] || 'User'

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName}! 👋
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
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </p>
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
          <div className="divide-y divide-gray-100">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="mt-0.5 shrink-0">
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
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
        </Card>
      </div>

      {/* Admin Tip (if admin) */}
      {currentMember?.role === 'admin' && (
        <Card className="border-teal-200 bg-teal-50/50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-100 p-2.5">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-teal-900">Admin Tip</p>
              <p className="text-sm text-teal-700">
                You have 3 pending member approvals and 2 security pass requests.
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
