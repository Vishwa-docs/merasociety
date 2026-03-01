'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Pin,
  Eye,
  Pencil,
  Trash2,
  Send,
  MessageSquare,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getPriorityColor } from '@/lib/utils'
import type { Announcement, AnnouncementComment } from '@/lib/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Textarea } from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

const priorityBadgeVariant: Record<string, 'error' | 'warning' | 'info' | 'neutral'> = {
  urgent: 'error',
  high: 'warning',
  normal: 'info',
  low: 'neutral',
}

export default function AnnouncementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { currentMember } = useAppStore()

  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [comments, setComments] = useState<AnnouncementComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAuthor = currentMember?.id === announcement?.author_id
  const isAdmin = currentMember?.role === 'admin'
  const canEdit = isAuthor || isAdmin

  // Fetch announcement
  const fetchAnnouncement = useCallback(async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:members!author_id(id, full_name, flat_number, role, avatar_url),
          seen:announcement_seen(count)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      const ann = {
        ...data,
        seen_count: (data.seen as { count: number }[])?.[0]?.count || 0,
      } as Announcement

      setAnnouncement(ann)

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('announcement_comments')
        .select('*, author:members!author_id(full_name, flat_number, role, avatar_url)')
        .eq('announcement_id', id)
        .order('created_at', { ascending: true })

      setComments((commentsData || []) as AnnouncementComment[])

      // Mark as seen
      if (currentMember?.id) {
        await supabase
          .from('announcement_seen')
          .upsert(
            { announcement_id: id, member_id: currentMember.id },
            { onConflict: 'announcement_id,member_id' }
          )
      }
    } catch (err) {
      console.error('Failed to fetch announcement:', err)
      toast.error('Announcement not found')
    } finally {
      setLoading(false)
    }
  }, [id, currentMember?.id])

  useEffect(() => {
    fetchAnnouncement()
  }, [fetchAnnouncement])

  // Add comment
  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmittingComment(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.from('announcement_comments').insert({
        announcement_id: id,
        author_id: currentMember?.id,
        content: newComment.trim(),
      })

      if (error) throw error

      setNewComment('')
      toast.success('Comment added!')
      fetchAnnouncement()
    } catch (err) {
      console.error('Failed to add comment:', err)
      toast.error('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Delete announcement
  async function handleDelete() {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Announcement deleted')
      router.push('/dashboard/announcements')
    } catch (err) {
      console.error('Failed to delete announcement:', err)
      toast.error('Failed to delete announcement')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-7 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!announcement) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-gray-500">Announcement not found.</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push('/dashboard/announcements')}
        >
          Back to Announcements
        </Button>
      </div>
    )
  }

  const author = announcement.author as unknown as {
    full_name: string
    flat_number: string
    role: string
    avatar_url?: string | null
  } | undefined

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/announcements')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Announcements
        </button>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => toast('Edit feature coming soon', { icon: '✏️' })}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowDeleteModal(true)}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Announcement card */}
      <Card
        className={`${
          announcement.is_pinned ? 'border-l-4 border-l-teal-500' : ''
        } ${announcement.priority === 'urgent' ? 'ring-1 ring-red-200' : ''}`}
      >
        <div className="space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {announcement.is_pinned && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600">
                <Pin className="h-3.5 w-3.5" />
                Pinned
              </span>
            )}
            <Badge
              variant={priorityBadgeVariant[announcement.priority] || 'neutral'}
            >
              {announcement.priority.charAt(0).toUpperCase() +
                announcement.priority.slice(1)}
            </Badge>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(announcement.priority)}`}>
              {announcement.priority} priority
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            {announcement.title}
          </h1>

          {/* Author + time */}
          <div className="flex items-center gap-3">
            <Avatar
              name={author?.full_name || 'Unknown'}
              src={author?.avatar_url}
              size="md"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {author?.full_name || 'Unknown'}
              </p>
              <p className="text-xs text-gray-500">
                {author?.flat_number && `${author.flat_number} · `}
                {formatDate(announcement.created_at)}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-4">
            {announcement.content}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 pt-3 border-t border-gray-100 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              Seen by {announcement.seen_count || 0} members
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              {comments.length} comments
            </span>
          </div>
        </div>
      </Card>

      {/* Comments section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Comments ({comments.length})
        </h2>

        {comments.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">
            No comments yet. Be the first to comment!
          </p>
        )}

        {comments.map((comment) => {
          const cAuthor = comment.author as unknown as {
            full_name: string
            flat_number: string
            avatar_url?: string | null
          } | undefined

          return (
            <div
              key={comment.id}
              className="flex gap-3 bg-white rounded-xl border border-gray-100 p-4"
            >
              <Avatar
                name={cAuthor?.full_name || 'Unknown'}
                src={cAuthor?.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">
                    {cAuthor?.full_name || 'Unknown'}
                  </span>
                  {cAuthor?.flat_number && (
                    <span className="text-xs text-gray-400">
                      {cAuthor.flat_number}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    · {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          )
        })}

        {/* Add comment form */}
        <form onSubmit={handleAddComment} className="flex gap-3 items-end">
          <div className="flex-1">
            <Textarea
              placeholder="Write a comment..."
              rows={2}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="md"
            loading={submittingComment}
            disabled={!newComment.trim()}
            icon={<Send className="h-4 w-4" />}
          >
            Post
          </Button>
        </form>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Announcement"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this announcement? This action cannot be
            undone and all comments will be removed.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
