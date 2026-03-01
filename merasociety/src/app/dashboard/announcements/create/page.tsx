'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

const priorityOptions = [
  { value: 'low', label: '🟢 Low' },
  { value: 'normal', label: '🔵 Normal' },
  { value: 'high', label: '🟠 High' },
  { value: 'urgent', label: '🔴 Urgent' },
]

export default function CreateAnnouncementPage() {
  const router = useRouter()
  const { currentMember, currentSociety } = useAppStore()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState('normal')
  const [isPinned, setIsPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})

  function validate(): boolean {
    const e: { title?: string; content?: string } = {}
    if (!title.trim()) e.title = 'Title is required'
    else if (title.trim().length < 5) e.title = 'Title must be at least 5 characters'
    if (!content.trim()) e.content = 'Content is required'
    else if (content.trim().length < 10) e.content = 'Content must be at least 10 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)

    try {
      const supabase = createClient()
      const societyId = currentSociety?.id
      if (!societyId || !currentMember?.id) {
        toast.error('Not authenticated')
        return
      }

      const { error } = await supabase.from('announcements').insert({
        society_id: societyId,
        author_id: currentMember.id,
        title: title.trim(),
        content: content.trim(),
        priority,
        is_pinned: isPinned,
      })

      if (error) throw error

      toast.success('Announcement created successfully!')
      router.push('/dashboard/announcements')
    } catch (err) {
      console.error('Failed to create announcement:', err)
      toast.error('Failed to create announcement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Announcement</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create a new notice for your society
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Title"
            placeholder="e.g. Water supply disruption on Monday"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }))
            }}
            error={errors.title}
          />

          <Textarea
            label="Content"
            placeholder="Write the full announcement details here..."
            rows={8}
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }))
            }}
            error={errors.content}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Priority"
              options={priorityOptions}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />

            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer select-none py-2">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-teal-600 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">Pin to top</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          {(title.trim() || content.trim()) && (
            <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50/50">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Preview
              </p>
              {title.trim() && (
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {title.trim()}
                </h3>
              )}
              {content.trim() && (
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {content.trim()}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              icon={<Send className="h-4 w-4" />}
            >
              Publish Announcement
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
