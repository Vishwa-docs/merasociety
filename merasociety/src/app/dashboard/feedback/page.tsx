'use client'

import React, { useState } from 'react'
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  MessageCircle,
  AlertTriangle,
  Send,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Feedback, FeedbackType, FeedbackStatus } from '@/lib/types'

const FEEDBACK_TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
  { value: 'complaint', label: 'Complaint' },
]

const DEMO_FEEDBACK: Feedback[] = [
  {
    id: 'fb-1',
    society_id: '00000000-0000-0000-0000-000000000001',
    member_id: 'demo-member-2',
    type: 'bug',
    title: 'Chat page not loading on mobile',
    description: 'When I open the chat page on my phone (iPhone 14), the message list does not load and shows a blank screen.',
    status: 'in_progress',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'fb-2',
    society_id: '00000000-0000-0000-0000-000000000001',
    member_id: 'demo-member-2',
    type: 'feature',
    title: 'Add dark mode support',
    description: 'It would be great to have a dark mode toggle in settings for nighttime usage.',
    status: 'open',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'fb-3',
    society_id: '00000000-0000-0000-0000-000000000001',
    member_id: 'demo-member-2',
    type: 'complaint',
    title: 'Noise from parking area at night',
    description: 'There has been consistent noise from the parking area between 11 PM and 1 AM. Requesting admin to look into it.',
    status: 'resolved',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
]

function getTypeIcon(type: FeedbackType) {
  switch (type) {
    case 'bug': return <Bug className="h-4 w-4" />
    case 'feature': return <Lightbulb className="h-4 w-4" />
    case 'general': return <MessageCircle className="h-4 w-4" />
    case 'complaint': return <AlertTriangle className="h-4 w-4" />
  }
}

function getTypeBadgeVariant(type: FeedbackType) {
  switch (type) {
    case 'bug': return 'error' as const
    case 'feature': return 'info' as const
    case 'general': return 'neutral' as const
    case 'complaint': return 'warning' as const
  }
}

function getStatusBadgeVariant(status: FeedbackStatus) {
  switch (status) {
    case 'open': return 'success' as const
    case 'in_progress': return 'warning' as const
    case 'resolved': return 'info' as const
    case 'closed': return 'neutral' as const
  }
}

function getTypeLabel(type: FeedbackType) {
  switch (type) {
    case 'bug': return 'Bug'
    case 'feature': return 'Feature'
    case 'general': return 'General'
    case 'complaint': return 'Complaint'
  }
}

function getStatusLabel(status: FeedbackStatus) {
  switch (status) {
    case 'open': return 'Open'
    case 'in_progress': return 'In Progress'
    case 'resolved': return 'Resolved'
    case 'closed': return 'Closed'
  }
}

export default function FeedbackPage() {
  const { isDemoMode } = useAppStore()

  const [feedbackList, setFeedbackList] = useState<Feedback[]>(DEMO_FEEDBACK)
  const [type, setType] = useState<FeedbackType>('general')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    setSubmitting(true)
    try {
      await new Promise((r) => setTimeout(r, 400))

      const newFeedback: Feedback = {
        id: `fb-${Date.now()}`,
        society_id: '00000000-0000-0000-0000-000000000001',
        member_id: 'demo-member-2',
        type,
        title: title.trim(),
        description: description.trim() || null,
        status: 'open',
        created_at: new Date().toISOString(),
      }

      setFeedbackList((prev) => [newFeedback, ...prev])
      setTitle('')
      setDescription('')
      setType('general')
      toast.success('Feedback submitted successfully!')
    } catch {
      toast.error('Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="text-gray-500 mt-1">Submit feedback, report bugs or request features</p>
      </div>

      {/* Submit Form */}
      <Card header={
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5 text-teal-600" />
          <span>Submit Feedback</span>
        </div>
      }>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Type"
            options={FEEDBACK_TYPE_OPTIONS}
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
          />
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your feedback"
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide more details (optional)"
            rows={4}
          />
          <Button
            type="submit"
            loading={submitting}
            icon={<Send className="h-4 w-4" />}
          >
            Submit Feedback
          </Button>
        </form>
      </Card>

      {/* Previous Feedback */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Feedback</h2>
        {feedbackList.length === 0 ? (
          <EmptyState
            icon={<MessageCircle />}
            title="No feedback yet"
            description="Submit your first feedback using the form above."
          />
        ) : (
          <div className="space-y-3">
            {feedbackList.map((fb) => (
              <Card key={fb.id}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-600 shrink-0 mt-0.5">
                    {getTypeIcon(fb.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900">{fb.title}</h3>
                    </div>
                    {fb.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{fb.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant={getTypeBadgeVariant(fb.type)}>{getTypeLabel(fb.type)}</Badge>
                      <Badge variant={getStatusBadgeVariant(fb.status)} dot>{getStatusLabel(fb.status)}</Badge>
                      <span className="text-xs text-gray-400">{formatDate(fb.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
