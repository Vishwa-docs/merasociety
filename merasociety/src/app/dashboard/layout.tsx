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

const DEMO_MEMBER: Member = {
  id: 'demo-member-1',
  user_id: 'demo-user-1',
  society_id: '00000000-0000-0000-0000-000000000001',
  full_name: 'Demo User',
  flat_number: 'A-101',
  phone: null,
  avatar_url: null,
  role: 'admin',
  status: 'approved',
  is_verified: true,
  created_at: new Date().toISOString(),
}

const DEMO_SOCIETY: Society = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Sunrise Heights',
  address: '123 Demo Colony, Mumbai',
  invite_code: 'DEMO2025',
  settings: {},
  created_at: new Date().toISOString(),
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [initializing, setInitializing] = useState(true)

  const {
    isDemoMode,
    setCurrentMember,
    setCurrentSociety,
    setLoading,
    setDemoMode,
  } = useAppStore()

  useEffect(() => {
    async function init() {
      const supabase = createClient()

      // Check if Supabase is actually configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const isRealSupabase = supabaseUrl && !supabaseUrl.includes('placeholder')

      if (!isRealSupabase) {
        // Auto-enable demo mode when Supabase is not configured
        setDemoMode(true)
        setCurrentMember(DEMO_MEMBER)
        setCurrentSociety(DEMO_SOCIETY)
        setLoading(false)
        setInitializing(false)
        return
      }

      // Check for authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // No user — check if demo mode is enabled
        if (isDemoMode || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
          setDemoMode(true)
          setCurrentMember(DEMO_MEMBER)
          setCurrentSociety(DEMO_SOCIETY)
          setLoading(false)
          setInitializing(false)
          return
        }

        // Not authenticated and not demo → redirect to login
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
    }

    init()
  }, [isDemoMode, router, setCurrentMember, setCurrentSociety, setDemoMode, setLoading])

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
