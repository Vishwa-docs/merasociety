'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Plus,
  ScanLine,
  Search,
  Phone,
  Clock,
  Calendar,
  User,
  XCircle,
} from 'lucide-react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { useAppStore, useDemoStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime, getStatusColor, getPassTypeLabel } from '@/lib/utils'
import type { VisitorPass, PassStatus } from '@/lib/types'
import Card from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

type FilterTab = 'active' | 'used' | 'expired' | 'all'

const statusBadgeVariant: Record<string, 'success' | 'info' | 'error' | 'warning' | 'neutral'> = {
  active: 'success',
  used: 'info',
  expired: 'error',
  cancelled: 'warning',
}

const passTypeBadgeClass: Record<string, string> = {
  guest: 'bg-blue-50 text-blue-700 border-blue-200',
  contractor: 'bg-orange-50 text-orange-700 border-orange-200',
  delivery: 'bg-purple-50 text-purple-700 border-purple-200',
}

export default function SecurityPage() {
  const router = useRouter()
  const { currentMember, currentSociety, isDemoMode } = useAppStore()
  const demoStore = useDemoStore()

  const [passes, setPasses] = useState<VisitorPass[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('active')
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})

  const isAdmin = currentMember?.role === 'admin'

  // Fetch passes
  useEffect(() => {
    async function fetchPasses() {
      setLoading(true)

      if (isDemoMode) {
        if (!demoStore.initialized) demoStore.initialize()
        setPasses(demoStore.passes as unknown as VisitorPass[])
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const societyId = currentSociety?.id
        if (!societyId) return

        const { data, error } = await supabase
          .from('visitor_passes')
          .select(`
            *,
            creator:members!created_by(full_name, flat_number, role, avatar_url)
          `)
          .eq('society_id', societyId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setPasses((data || []) as VisitorPass[])
      } catch (err) {
        console.error('Failed to fetch passes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPasses()
  }, [isDemoMode, currentSociety?.id, demoStore])

  // Generate QR codes for all passes
  useEffect(() => {
    async function generateQRCodes() {
      const codes: Record<string, string> = {}
      for (const pass of passes) {
        try {
          codes[pass.id] = await QRCode.toDataURL(pass.pass_code, {
            width: 80,
            margin: 1,
            color: { dark: '#0d9488', light: '#ffffff' },
          })
        } catch {
          // skip invalid
        }
      }
      setQrCodes(codes)
    }
    if (passes.length > 0) generateQRCodes()
  }, [passes])

  // Cancel / revoke pass
  const handleCancel = useCallback(
    async (passId: string) => {
      if (!confirm('Cancel this visitor pass?')) return

      if (isDemoMode) {
        setPasses((prev) =>
          prev.map((p) =>
            p.id === passId ? { ...p, status: 'cancelled' as PassStatus } : p
          )
        )
        toast.success('Pass cancelled')
        return
      }

      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('visitor_passes')
          .update({ status: 'cancelled' })
          .eq('id', passId)

        if (error) throw error

        setPasses((prev) =>
          prev.map((p) =>
            p.id === passId ? { ...p, status: 'cancelled' as PassStatus } : p
          )
        )
        toast.success('Pass cancelled')
      } catch {
        toast.error('Failed to cancel pass')
      }
    },
    [isDemoMode]
  )

  // Filter + search
  const filtered = useMemo(() => {
    let list = [...passes]

    if (activeTab !== 'all') {
      list = list.filter((p) => p.status === activeTab)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.visitor_name.toLowerCase().includes(q) ||
          p.pass_code.toLowerCase().includes(q)
      )
    }

    return list
  }, [passes, activeTab, search])

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: passes.filter((p) => p.status === 'active').length },
    { id: 'used', label: 'Used', count: passes.filter((p) => p.status === 'used').length },
    { id: 'expired', label: 'Expired', count: passes.filter((p) => p.status === 'expired').length },
    { id: 'all', label: 'All', count: passes.length },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-teal-600" />
            Security Passes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage visitor passes for your society
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<ScanLine className="h-4 w-4" />}
            onClick={() => router.push('/dashboard/security/verify')}
          >
            Verify Pass
          </Button>
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/dashboard/security/create')}
          >
            Create Pass
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        type="search"
        placeholder="Search by visitor name or pass code..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={<Search className="h-4 w-4" />}
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            <span
              className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={<Shield />}
          title="No passes found"
          description={
            search
              ? 'Try a different search term'
              : activeTab === 'all'
              ? 'Create your first visitor pass to get started'
              : `No ${activeTab} passes right now`
          }
          actionLabel={activeTab === 'all' && !search ? 'Create Pass' : undefined}
          onAction={
            activeTab === 'all' && !search
              ? () => router.push('/dashboard/security/create')
              : undefined
          }
        />
      )}

      {/* Pass cards */}
      {!loading && (
        <div className="space-y-4">
          {filtered.map((pass) => {
            const canCancel =
              pass.status === 'active' &&
              (pass.created_by === currentMember?.id || isAdmin)
            const creator = pass.creator as
              | { full_name: string; flat_number: string }
              | undefined

            return (
              <Card key={pass.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* QR code thumbnail */}
                  <div className="flex-shrink-0 flex items-start justify-center sm:justify-start">
                    {qrCodes[pass.id] ? (
                      <img
                        src={qrCodes[pass.id]}
                        alt={`QR for ${pass.pass_code}`}
                        className="h-20 w-20 rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Shield className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Top row: name + badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-base">
                        {pass.visitor_name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          passTypeBadgeClass[pass.pass_type] || 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {getPassTypeLabel(pass.pass_type)}
                      </span>
                      <Badge variant={statusBadgeVariant[pass.status] || 'neutral'} dot>
                        {pass.status.charAt(0).toUpperCase() + pass.status.slice(1)}
                      </Badge>
                    </div>

                    {/* Pass code */}
                    <div className="font-mono text-xl font-bold tracking-widest text-teal-700 bg-teal-50 px-3 py-1 rounded-md inline-block">
                      {pass.pass_code}
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                      {pass.visitor_phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {pass.visitor_phone}
                        </div>
                      )}
                      {pass.purpose && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {pass.purpose}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {pass.expected_date}
                      </div>
                      {pass.expected_time_start && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {formatTime(pass.expected_time_start)}
                          {pass.expected_time_end
                            ? ` – ${formatTime(pass.expected_time_end)}`
                            : ''}
                        </div>
                      )}
                    </div>

                    {/* Footer: created by + actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-gray-400">
                        Created by{' '}
                        <span className="font-medium text-gray-600">
                          {creator?.full_name || 'Unknown'}
                        </span>
                        {creator?.flat_number && (
                          <> · {creator.flat_number}</>
                        )}
                        {' · '}
                        {formatDate(pass.created_at)}
                      </span>

                      {canCancel && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<XCircle className="h-3.5 w-3.5" />}
                          onClick={() => handleCancel(pass.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
