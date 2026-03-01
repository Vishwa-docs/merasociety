'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Member, Society } from '@/lib/types'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    setCurrentMember,
    setCurrentSociety,
    setLoading,
  } = useAppStore()

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()

        // Check for authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          // Not authenticated → redirect to login
          router.push('/auth/login')
          return
        }

        // Fetch member data
        const { data: member } = await supabase
          .from('members')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .single()

        if (!member) {
          // User exists but no approved membership
          router.push('/join')
          return
        }

        setCurrentMember(member as Member)

        // Fetch their society
        const { data: society } = await supabase
          .from('societies')
          .select('*')
          .eq('id', member.society_id)
          .single()

        if (society) {
          setCurrentSociety(society as Society)
        }

        setLoading(false)
        setInitializing(false)
      } catch (err) {
        console.error('Dashboard init error:', err)
        setError('Failed to load your dashboard. Please check your connection and try again.')
        setInitializing(false)
      }
    }

    init()
  }, [router, setCurrentMember, setCurrentSociety, setLoading])

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
          <p className="mt-3 text-sm text-gray-500">Loading your society...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <p className="text-lg font-medium text-red-600">Something went wrong</p>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — desktop */}
      <Sidebar />

      {/* Main area — offset left for sidebar on desktop */}
      <div className="md:pl-64">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* Bottom nav — mobile */}
      <MobileNav />
    </div>
  )
}
