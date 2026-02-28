'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Bell,
  MessageCircle,
  ShoppingBag,
  Shield,
  Trophy,
  Settings2,
  User,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
  { label: 'Announcements', href: '/dashboard/announcements', icon: <Bell className="h-5 w-5" /> },
  { label: 'Chat', href: '/dashboard/chat', icon: <MessageCircle className="h-5 w-5" /> },
  { label: 'Bazaar', href: '/dashboard/bazaar', icon: <ShoppingBag className="h-5 w-5" /> },
  { label: 'Security', href: '/dashboard/security', icon: <Shield className="h-5 w-5" /> },
  { label: 'Sports', href: '/dashboard/sports', icon: <Trophy className="h-5 w-5" /> },
  { label: 'Admin', href: '/dashboard/admin', icon: <Settings2 className="h-5 w-5" />, adminOnly: true },
  { label: 'Settings', href: '/dashboard/settings', icon: <User className="h-5 w-5" /> },
  { label: 'Feedback', href: '/dashboard/feedback', icon: <MessageSquare className="h-5 w-5" /> },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const currentMember = useAppStore((s) => s.currentMember)
  const currentSociety = useAppStore((s) => s.currentSociety)

  const isAdmin = !currentMember || currentMember.role === 'admin'

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Society Name */}
      <div className="flex items-center h-16 px-4 border-b border-gray-100 shrink-0">
        <Building2 className="h-7 w-7 text-teal-600 shrink-0" />
        {!collapsed && (
          <span className="ml-3 font-bold text-gray-900 truncate text-lg">
            {currentSociety?.name || 'MeraSociety'}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span
                className={cn(
                  'shrink-0',
                  active ? 'text-teal-600' : 'text-gray-400'
                )}
              >
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-gray-100 shrink-0">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center w-full p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
