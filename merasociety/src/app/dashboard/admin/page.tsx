'use client'

import React, { useState, useMemo } from 'react'
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
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { formatDate, getInitials } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import type { Member, AuditLogEntry } from '@/lib/types'

// ── Demo data ────────────────────────────────────────────────
const DEMO_MEMBERS: Member[] = [
  { id: 'dm-1', user_id: 'u1', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'A-101', full_name: 'Rajesh Kumar', phone: '9876543210', avatar_url: null, role: 'admin', status: 'approved', is_verified: true, created_at: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: 'dm-2', user_id: 'u2', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'B-302', full_name: 'Priya Sharma', phone: '9876543211', avatar_url: null, role: 'resident', status: 'approved', is_verified: true, created_at: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: 'dm-3', user_id: 'u3', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'C-501', full_name: 'Anita Desai', phone: '9876543212', avatar_url: null, role: 'resident', status: 'approved', is_verified: true, created_at: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: 'dm-4', user_id: 'u4', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'A-204', full_name: 'Meena Rathore', phone: '9876543213', avatar_url: null, role: 'resident', status: 'approved', is_verified: false, created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'dm-5', user_id: 'u5', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'D-103', full_name: 'Vikram Singh', phone: '9876543214', avatar_url: null, role: 'resident', status: 'approved', is_verified: true, created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'dm-6', user_id: 'u6', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'B-105', full_name: 'Deepak Nair', phone: '9876543215', avatar_url: null, role: 'resident', status: 'suspended', is_verified: true, created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'dm-7', user_id: 'u7', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'A-403', full_name: 'Ramesh Gupta', phone: '9876543216', avatar_url: null, role: 'guard', status: 'approved', is_verified: true, created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'dm-8', user_id: 'u8', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'C-202', full_name: 'Sunita Verma', phone: '9876543217', avatar_url: null, role: 'resident', status: 'approved', is_verified: false, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
]

const DEMO_PENDING: Member[] = [
  { id: 'dp-1', user_id: 'up1', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'D-405', full_name: 'Kiran Patel', phone: '9988776655', avatar_url: null, role: 'resident', status: 'pending', is_verified: false, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'dp-2', user_id: 'up2', society_id: '00000000-0000-0000-0000-000000000001', flat_number: 'B-601', full_name: 'Arjun Mehta', phone: '9988776644', avatar_url: null, role: 'resident', status: 'pending', is_verified: false, created_at: new Date(Date.now() - 86400000).toISOString() },
]

const DEMO_AUDIT: AuditLogEntry[] = [
  { id: 'al-1', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-1', action: 'Approved member Priya Sharma', entity_type: 'member', entity_id: 'dm-2', details: null, created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'al-2', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-1', action: 'Created announcement: Water Supply Disruption', entity_type: 'announcement', entity_id: 'demo-ann-1', details: null, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'al-3', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-7', action: 'Verified pass XK7M2N for Amit Patel', entity_type: 'visitor_pass', entity_id: 'demo-pass-1', details: null, created_at: new Date(Date.now() - 5400000).toISOString() },
  { id: 'al-4', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-1', action: 'Suspended member Deepak Nair', entity_type: 'member', entity_id: 'dm-6', details: null, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'al-5', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-2', action: 'Created listing: Samsung 7kg Washing Machine', entity_type: 'listing', entity_id: 'demo-listing-1', details: null, created_at: new Date(Date.now() - 10800000).toISOString() },
  { id: 'al-6', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-1', action: 'Updated society settings', entity_type: 'society', entity_id: '00000000-0000-0000-0000-000000000001', details: null, created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: 'al-7', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-3', action: 'Booked Badminton Court for 6:00 PM', entity_type: 'booking', entity_id: 'b1', details: null, created_at: new Date(Date.now() - 18000000).toISOString() },
  { id: 'al-8', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-1', action: 'Approved member Anita Desai', entity_type: 'member', entity_id: 'dm-3', details: null, created_at: new Date(Date.now() - 21600000).toISOString() },
  { id: 'al-9', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-5', action: 'Created listing: IKEA Study Table + Chair', entity_type: 'listing', entity_id: 'demo-listing-4', details: null, created_at: new Date(Date.now() - 43200000).toISOString() },
  { id: 'al-10', society_id: '00000000-0000-0000-0000-000000000001', member_id: 'dm-1', action: 'Created channel #maintenance', entity_type: 'channel', entity_id: 'ch-1', details: null, created_at: new Date(Date.now() - 86400000).toISOString() },
]

function getMemberName(memberId: string | null): string {
  if (!memberId) return 'System'
  const m = DEMO_MEMBERS.find((m) => m.id === memberId) || DEMO_PENDING.find((m) => m.id === memberId)
  return m?.full_name || 'Unknown'
}

// ── Page Component ───────────────────────────────────────────
export default function AdminPage() {
  const { currentMember, isDemoMode } = useAppStore()

  // Access check
  const isAdmin = isDemoMode || currentMember?.role === 'admin'

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
  const stats = [
    { label: 'Total Members', value: DEMO_MEMBERS.length, icon: <Users className="h-5 w-5" />, color: 'text-teal-600 bg-teal-50' },
    { label: 'Pending Approvals', value: DEMO_PENDING.length, icon: <ClipboardCheck className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50' },
    { label: 'Active Listings', value: 5, icon: <ShoppingBag className="h-5 w-5" />, color: 'text-purple-600 bg-purple-50' },
    { label: 'Today Bookings', value: 3, icon: <CalendarCheck className="h-5 w-5" />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Passes', value: 2, icon: <BadgeCheck className="h-5 w-5" />, color: 'text-green-600 bg-green-50' },
  ]

  // Simple bar chart data
  const chartData = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 8 },
    { label: 'Wed', value: 15 },
    { label: 'Thu', value: 10 },
    { label: 'Fri', value: 18 },
    { label: 'Sat', value: 22 },
    { label: 'Sun', value: 14 },
  ]
  const maxVal = Math.max(...chartData.map((d) => d.value))

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
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

      {/* Activity chart */}
      <Card header="Weekly Activity">
        <div className="flex items-end justify-between gap-2 h-40">
          {chartData.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-600">{d.value}</span>
              <div
                className="w-full bg-teal-500 rounded-t-md transition-all duration-300"
                style={{ height: `${(d.value / maxVal) * 100}%` }}
              />
              <span className="text-xs text-gray-500">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card header="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            icon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => toast.success('All pending members approved!')}
          >
            Approve All Pending
          </Button>
          <Button
            variant="secondary"
            icon={<Megaphone className="h-4 w-4" />}
            onClick={() => toast.success('Redirecting to create announcement...')}
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
  const [members, setMembers] = useState<Member[]>(DEMO_MEMBERS)
  const [search, setSearch] = useState('')
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(
      (m) => m.full_name.toLowerCase().includes(q) || m.flat_number.toLowerCase().includes(q)
    )
  }, [members, search])

  const handleRoleChange = (memberId: string, newRole: 'admin' | 'resident' | 'guard') => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
    setRoleDropdown(null)
    toast.success('Role updated successfully')
  }

  const handleToggleStatus = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, status: m.status === 'suspended' ? 'approved' : 'suspended' }
          : m
      )
    )
    toast.success('Member status updated')
  }

  const handleVerify = (memberId: string) => {
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
          description="Try adjusting your search query."
        />
      )}
    </div>
  )
}

// ── Approvals Tab ────────────────────────────────────────────
function ApprovalsTab() {
  const [pending, setPending] = useState<Member[]>(DEMO_PENDING)
  const [confirmModal, setConfirmModal] = useState<{ action: 'approve' | 'reject'; member: Member } | null>(null)

  const handleAction = (action: 'approve' | 'reject', member: Member) => {
    setConfirmModal({ action, member })
  }

  const confirmAction = () => {
    if (!confirmModal) return
    setPending((prev) => prev.filter((m) => m.id !== confirmModal.member.id))
    toast.success(
      confirmModal.action === 'approve'
        ? `${confirmModal.member.full_name} has been approved!`
        : `${confirmModal.member.full_name} has been rejected.`
    )
    setConfirmModal(null)
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

      {/* Confirmation modal */}
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

  return (
    <div className="space-y-2">
      {DEMO_AUDIT.map((entry) => (
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
              <span className="text-xs text-gray-500">by {getMemberName(entry.member_id)}</span>
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
