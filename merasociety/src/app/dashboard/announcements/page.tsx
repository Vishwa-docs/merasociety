'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Megaphone,
  Pin,
  Search,
  Plus,
  MessageSquare,
  Eye,
  AlertTriangle,
} from 'lucide-react'
import { useAppStore, useDemoStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { formatDate, truncate, getPriorityColor } from '@/lib/utils'
import type { Announcement } from '@/lib/types'
import Card from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'

type FilterTab = 'all' | 'pinned' | 'urgent'

const priorityBadgeVariant: Record<string, 'error' | 'warning' | 'info' | 'neutral'> = {
  urgent: 'error',
  high: 'warning',
  normal: 'info',
  low: 'neutral',
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const { currentMember, currentSociety, isDemoMode } = useAppStore()
  const demoStore = useDemoStore()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const isAdmin = currentMember?.role === 'admin'

  // Fetch announcements
  useEffect(() => {
    async function fetchAnnouncements() {
      setLoading(true)

      if (isDemoMode) {
        if (!demoStore.initialized) demoStore.initialize()
        setAnnouncements(demoStore.announcements as unknown as Announcement[])
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const societyId = currentSociety?.id
        if (!societyId) return

        const { data, error } = await supabase
          .from('announcements')
          .select(`
            *,
            author:members!author_id(full_name, flat_number, role, avatar_url),
            comments:announcement_comments(count),
            seen:announcement_seen(count)
          `)
          .eq('society_id', societyId)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })

        if (error) throw error

        const mapped = (data || []).map((a: Record<string, unknown>) => ({
          ...a,
          comments_count: (a.comments as { count: number }[])?.[0]?.count || 0,
          seen_count: (a.seen as { count: number }[])?.[0]?.count || 0,
        })) as Announcement[]

        setAnnouncements(mapped)
      } catch (err) {
        console.error('Failed to fetch announcements:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [isDemoMode, currentSociety?.id, demoStore])

  // Filter + search
  const filtered = useMemo(() => {
    let list = [...announcements]

    if (activeTab === 'pinned') {
      list = list.filter((a) => a.is_pinned)
    } else if (activeTab === 'urgent') {
      list = list.filter((a) => a.priority === 'urgent' || a.priority === 'high')
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      )
    }

    // Sort pinned first, then by created_at desc
    list.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return list
  }, [announcements, activeTab, search])

  const tabs: { id: FilterTab; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    { id: 'pinned', label: 'Pinned', icon: <Pin className="h-3.5 w-3.5" /> },
    { id: 'urgent', label: 'Urgent', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with society news and notices
          </p>
        </div>
        {isAdmin && (
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/dashboard/announcements/create')}
          >
            New Announcement
          </Button>
        )}
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search announcements..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex border-b sm:border-b-0 border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px sm:mb-0 sm:border-b-0 sm:rounded-lg ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-600 sm:bg-teal-50 sm:border-transparent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 sm:hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Card>
          <EmptyState
            icon={<Megaphone />}
            title={search ? 'No matching announcements' : 'No announcements yet'}
            description={
              search
                ? 'Try adjusting your search terms'
                : 'Announcements from your society will appear here'
            }
            actionLabel={isAdmin ? 'Create Announcement' : undefined}
            onAction={
              isAdmin ? () => router.push('/dashboard/announcements/create') : undefined
            }
          />
        </Card>
      )}

      {/* Announcement list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((ann) => {
            const author = ann.author as unknown as {
              full_name: string
              flat_number: string
              role: string
              avatar_url?: string | null
            } | undefined

            return (
              <Card
                key={ann.id}
                className={`group transition-all duration-200 hover:border-teal-200 ${
                  ann.is_pinned ? 'border-l-4 border-l-teal-500' : ''
                } ${ann.priority === 'urgent' ? 'ring-1 ring-red-200' : ''}`}
                onClick={() => router.push(`/dashboard/announcements/${ann.id}`)}
              >
                <div className="flex flex-col gap-3">
                  {/* Top row: badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {ann.is_pinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </span>
                    )}
                    <Badge variant={priorityBadgeVariant[ann.priority] || 'neutral'}>
                      {ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1)}
                    </Badge>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatDate(ann.created_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-teal-700 transition-colors leading-snug">
                    {ann.title}
                  </h3>

                  {/* Content preview */}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {truncate(ann.content, 150)}
                  </p>

                  {/* Footer: author + stats */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={author?.full_name || 'Unknown'}
                        src={author?.avatar_url}
                        size="sm"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          {author?.full_name || 'Unknown'}
                        </span>
                        {author?.flat_number && (
                          <span className="text-xs text-gray-400 ml-1.5">
                            {author.flat_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {ann.comments_count || 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {ann.seen_count || 0}
                      </span>
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
