'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Menu, Bell, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import Avatar from '@/components/ui/Avatar'

interface HeaderProps {
  title?: string
  onMenuToggle?: () => void
  unreadCount?: number
}

export function Header({ title = 'Dashboard', onMenuToggle, unreadCount = 0 }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const currentMember = useAppStore((s) => s.currentMember)

  const displayName = currentMember?.full_name || 'User'
  const flatNumber = currentMember?.flat_number || ''

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 md:pl-6">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
      </div>

      {/* Right: notification + avatar */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Link
          href="/dashboard/announcements"
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Avatar dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="User menu"
          >
            <Avatar name={displayName} src={currentMember?.avatar_url} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                {displayName}
              </p>
              {flatNumber && (
                <p className="text-xs text-gray-500">{flatNumber}</p>
              )}
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1 animate-fadeIn">
              <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                {flatNumber && (
                  <p className="text-xs text-gray-500">{flatNumber}</p>
                )}
              </div>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                className={cn(
                  'flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors'
                )}
                onClick={() => {
                  setDropdownOpen(false)
                  // Sign out logic handled by parent
                  window.location.href = '/'
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
