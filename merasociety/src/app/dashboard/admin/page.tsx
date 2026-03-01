'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Shield,
  Users,
  ClipboardCheck,
  ScrollText,
  BarChart3,
  ShoppingBag,
  CalendarCheck,
  BadgeCheck,
  Search,
  CheckCircle2,
  XCircle,
  Megaphone,
  ChevronDown,
  UserCog,
  Ban,
  RotateCcw,
  Clock,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getInitials } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import type { Member, AuditLogEntry } from '@/lib/types'

// ── Page Component ───────────────────────────────────────────
export default function AdminPage() {
  const { currentMember } = useAppStore()

  const isAdmin = currentMember?.role === 'admin'

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Shield className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 max-w-md">
          You need administrator privileges to access this page. Contact your society admin if you believe this is an error.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage your society members, approvals and settings</p>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" />, content: <OverviewTab /> },
          { id: 'members', label: 'Members', icon: <Users className="h-4 w-4" />, content: <MembersTab /> },
          { id: 'approvals', label: 'Approvals', icon: <ClipboardCheck className="h-4 w-4" />, content: <ApprovalsTab /> },
          { id: 'audit', label: 'Audit Log', icon: <ScrollText className="h-4 w-4" />, content: <AuditLogTab /> },
        ]}
      />
    </div>
  )
}

// ── Overview Tab ─────────────────────────────────────────────
function OverviewTab() {
  const { currentSociety } = useAppStore()
  const [stats, setStats] = useState({ members: 0, pending: 0, listings: 0, bookings: 0, passes: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!currentSociety) { setLoading(false); return }
      try {
        const supabase = createClient()

        const [membersRes, pendingRes, listingsRes, bookingsRes, passesRes] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact', head: true }).eq('society_id', currentSociety.id).eq('status', 'approved'),
          supabase.from('members').select('id', { count: 'exact', head: true }).eq('society_id', currentSociety.id).eq('status', 'pending'),
          supabase.from('listings').select('id', { count: 'exact', head: true }).eq('society_id', currentSociety.id).eq('status', 'active'),
          supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('society_id', currentSociety.id).eq('date', new Date().toISOString().split('T')[0]),
          supabase.from('visitor_passes').select('id', { count: 'exact', head: true }).eq('society_id', currentSociety.id).eq('status', 'active'),
        ])

        setStats({
          members: membersRes.count ?? 0,
          pending: pendingRes.count ?? 0,
          listings: listingsRes.count ?? 0,
          bookings: bookingsRes.count ?? 0,
          passes: passesRes.count ?? 0,
        })
      } catch (err) {
        console.error('Admin stats error:', err)
        toast.error('Failed to load admin stats')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [currentSociety])

  const statCards = [
    { label: 'Total Members', value: stats.members, icon: <Users className="h-5 w-5" />, color: 'text-teal-600 bg-teal-50' },
    { label: 'Pending Approvals', value: stats.pending, icon: <ClipboardCheck className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50' },
    { label: 'Active Listings', value: stats.listings, icon: <ShoppingBag className="h-5 w-5" />, color: 'text-purple-600 bg-purple-50' },
    { label: 'Today Bookings', value: stats.bookings, icon: <CalendarCheck className="h-5 w-5" />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Passes', value: stats.passes, icon: <BadgeCheck className="h-5 w-5" />, color: 'text-green-600 bg-green-50' },
  ]

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.color}`}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card header="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            icon={<Megaphone className="h-4 w-4" />}
            onClick={() => window.location.href = '/dashboard/announcements/create'}
          >
            Send Announcement
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ── Members Tab ──────────────────────────────────────────────
function MembersTab() {
  const { currentSociety } = useAppStore()
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMembers() {
      if (!currentSociety) { setLoading(false); return }
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('society_id', currentSociety.id)
          .neq('status', 'pending')
          .order('created_at', { ascending: true })

        if (error) throw error
        if (data) setMembers(data as Member[])
      } catch {
        toast.error('Failed to load members')
      } finally {
        setLoading(false)
      }
    }
    fetchMembers()
  }, [currentSociety])

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(
      (m) => m.full_name.toLowerCase().includes(q) || m.flat_number.toLowerCase().includes(q)
    )
  }, [members, search])

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'resident' | 'guard') => {
    const supabase = createClient()
    const { error } = await supabase.from('members').update({ role: newRole }).eq('id', memberId)
    if (error) { toast.error('Failed to update role'); return }
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
    setRoleDropdown(null)
    toast.success('Role updated successfully')
  }

  const handleToggleStatus = async (memberId: string) => {
    const supabase = createClient()
    const member = members.find((m) => m.id === memberId)
    if (!member) return
    const newStatus = member.status === 'suspended' ? 'approved' : 'suspended'
    const { error } = await supabase.from('members').update({ status: newStatus }).eq('id', memberId)
    if (error) { toast.error('Failed to update status'); return }
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m))
    )
    toast.success('Member status updated')
  }

  const handleVerify = async (memberId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('members').update({ is_verified: true }).eq('id', memberId)
    if (error) { toast.error('Failed to verify member'); return }
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, is_verified: true } : m)))
    toast.success('Member verified')
  }

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success' as const
      case 'pending': return 'warning' as const
      case 'suspended': return 'error' as const
      default: return 'neutral' as const
    }
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'info' as const
      case 'guard': return 'warning' as const
      default: return 'neutral' as const
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name or flat number..."
        icon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        type="search"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-3 px-3 font-medium text-gray-500">Name</th>
              <th className="py-3 px-3 font-medium text-gray-500">Flat</th>
              <th className="py-3 px-3 font-medium text-gray-500">Role</th>
              <th className="py-3 px-3 font-medium text-gray-500">Status</th>
              <th className="py-3 px-3 font-medium text-gray-500">Verified</th>
              <th className="py-3 px-3 font-medium text-gray-500">Joined</th>
              <th className="py-3 px-3 font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {getInitials(m.full_name)}
                    </div>
                    <span className="font-medium text-gray-900">{m.full_name}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-gray-600">{m.flat_number}</td>
                <td className="py-3 px-3">
                  <div className="relative">
                    <button
                      onClick={() => setRoleDropdown(roleDropdown === m.id ? null : m.id)}
                      className="inline-flex items-center gap-1"
                    >
                      <Badge variant={roleBadgeVariant(m.role)}>{m.role}</Badge>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </button>
                    {roleDropdown === m.id && (
                      <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                        {(['admin', 'resident', 'guard'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => handleRoleChange(m.id, r)}
                            className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 capitalize"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <Badge variant={statusBadgeVariant(m.status)} dot>{m.status}</Badge>
                </td>
                <td className="py-3 px-3">
                  {m.is_verified ? (
                    <BadgeCheck className="h-5 w-5 text-teal-600" />
                  ) : (
                    <span className="text-gray-400 text-xs">No</span>
                  )}
                </td>
                <td className="py-3 px-3 text-gray-500 text-xs">{formatDate(m.created_at)}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center justify-end gap-1">
                    {!m.is_verified && (
                      <button
                        onClick={() => handleVerify(m.id)}
                        className="p-1.5 rounded-md hover:bg-green-50 text-green-600"
                        title="Verify"
                      >
                        <BadgeCheck className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(m.id)}
                      className={`p-1.5 rounded-md ${m.status === 'suspended' ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-600'}`}
                      title={m.status === 'suspended' ? 'Activate' : 'Suspend'}
                    >
                      {m.status === 'suspended' ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<Users />}
          title="No members found"
          description={search ? 'Try adjusting your search query.' : 'No members in this society yet.'}
        />
      )}
    </div>
  )
}

// ── Approvals Tab ────────────────────────────────────────────
function ApprovalsTab() {
  const { currentSociety } = useAppStore()
  const [pending, setPending] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmModal, setConfirmModal] = useState<{ action: 'approve' | 'reject'; member: Member } | null>(null)

  useEffect(() => {
    async function fetchPending() {
      if (!currentSociety) { setLoading(false); return }
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('society_id', currentSociety.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
        if (error) throw error
        if (data) setPending(data as Member[])
      } catch {
        toast.error('Failed to load pending requests')
      } finally {
        setLoading(false)
      }
    }
    fetchPending()
  }, [currentSociety])

  const handleAction = (action: 'approve' | 'reject', member: Member) => {
    setConfirmModal({ action, member })
  }

  const confirmAction = async () => {
    if (!confirmModal) return
    const supabase = createClient()

    const newStatus = confirmModal.action === 'approve' ? 'approved' : 'rejected'
    const { error } = await supabase
      .from('members')
      .update({ status: newStatus })
      .eq('id', confirmModal.member.id)

    if (error) { toast.error('Failed to process request'); setConfirmModal(null); return }

    setPending((prev) => prev.filter((m) => m.id !== confirmModal.member.id))
    toast.success(
      confirmModal.action === 'approve'
        ? `${confirmModal.member.full_name} has been approved!`
        : `${confirmModal.member.full_name} has been rejected.`
    )
    setConfirmModal(null)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
  }

  return (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title="No pending requests"
          description="All membership requests have been processed."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pending.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {getInitials(m.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{m.full_name}</h3>
                  <p className="text-sm text-gray-500">Flat: {m.flat_number}</p>
                  <p className="text-sm text-gray-500">Phone: {m.phone || 'N/A'}</p>
                  <p className="text-xs text-gray-400 mt-1">Requested {formatDate(m.created_at)}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => handleAction('approve', m)}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<XCircle className="h-4 w-4" />}
                  onClick={() => handleAction('reject', m)}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.action === 'approve' ? 'Approve Member' : 'Reject Member'}
        size="sm"
      >
        <div className="p-5">
          <p className="text-sm text-gray-600">
            Are you sure you want to {confirmModal?.action}{' '}
            <strong>{confirmModal?.member.full_name}</strong> (Flat {confirmModal?.member.flat_number})?
          </p>
          <div className="flex gap-2 mt-6 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setConfirmModal(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmModal?.action === 'approve' ? 'primary' : 'danger'}
              size="sm"
              onClick={confirmAction}
            >
              {confirmModal?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Audit Log Tab ────────────────────────────────────────────
function AuditLogTab() {
  const { currentSociety } = useAppStore()
  const [auditLog, setAuditLog] = useState<(AuditLogEntry & { member_name?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAuditLog() {
      if (!currentSociety) { setLoading(false); return }
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('audit_log')
          .select('*, member:members!member_id(full_name)')
          .eq('society_id', currentSociety.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        if (data) {
          setAuditLog(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.map((entry: any) => ({
              ...(entry as AuditLogEntry),
              member_name:
                entry.member && typeof entry.member === 'object' && entry.member.full_name
                  ? String(entry.member.full_name)
                  : 'System',
            }))
          )
        }
      } catch {
        toast.error('Failed to load audit log')
      } finally {
        setLoading(false)
      }
    }
    fetchAuditLog()
  }, [currentSociety])

  const entityIcon = (type: string | null) => {
    switch (type) {
      case 'member': return <UserCog className="h-4 w-4" />
      case 'announcement': return <Megaphone className="h-4 w-4" />
      case 'visitor_pass': return <BadgeCheck className="h-4 w-4" />
      case 'listing': return <ShoppingBag className="h-4 w-4" />
      case 'booking': return <CalendarCheck className="h-4 w-4" />
      case 'channel': return <Users className="h-4 w-4" />
      default: return <ScrollText className="h-4 w-4" />
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
  }

  if (auditLog.length === 0) {
    return (
      <EmptyState
        icon={<ScrollText />}
        title="No audit log entries"
        description="Actions performed in this society will appear here."
      />
    )
  }

  return (
    <div className="space-y-2">
      {auditLog.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
        >
          <div className="p-2 rounded-lg bg-gray-100 text-gray-600 shrink-0 mt-0.5">
            {entityIcon(entry.entity_type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{entry.action}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">
                by {entry.member_name || 'System'}
              </span>
              {entry.entity_type && (
                <Badge variant="neutral">{entry.entity_type.replace('_', ' ')}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Clock className="h-3 w-3" />
            {formatDate(entry.created_at)}
          </div>
        </div>
      ))}
    </div>
  )
}
