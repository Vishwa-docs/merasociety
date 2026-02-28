'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Bell,
  MessageCircle,
  ShoppingBag,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const items: MobileNavItem[] = [
  { label: 'Home', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
  { label: 'Announce', href: '/dashboard/announcements', icon: <Bell className="h-5 w-5" /> },
  { label: 'Chat', href: '/dashboard/chat', icon: <MessageCircle className="h-5 w-5" /> },
  { label: 'Bazaar', href: '/dashboard/bazaar', icon: <ShoppingBag className="h-5 w-5" /> },
  { label: 'Security', href: '/dashboard/security', icon: <Shield className="h-5 w-5" /> },
]

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-colors min-w-0',
                active
                  ? 'text-teal-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <span className={cn(active && 'text-teal-600')}>{item.icon}</span>
              <span
                className={cn(
                  'text-[10px] font-medium truncate',
                  active ? 'text-teal-600' : 'text-gray-500'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}

export default MobileNav
