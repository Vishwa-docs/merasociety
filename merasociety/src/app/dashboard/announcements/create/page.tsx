'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Sparkles, Languages, Bot, Loader2, Wand2, PenLine } from 'lucide-react'
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

  // AI Composer state
  type ComposeMode = 'ai' | 'manual'
  const [mode, setMode] = useState<ComposeMode>('ai')
  const [roughText, setRoughText] = useState('')
  const [composing, setComposing] = useState(false)
  const [composed, setComposed] = useState(false)
  const [hindiTitle, setHindiTitle] = useState('')
  const [hindiContent, setHindiContent] = useState('')
  const [showHindi, setShowHindi] = useState(false)

  function validate(): boolean {
    const e: { title?: string; content?: string } = {}
    if (!title.trim()) e.title = 'Title is required'
    else if (title.trim().length < 5) e.title = 'Title must be at least 5 characters'
    if (!content.trim()) e.content = 'Content is required'
    else if (content.trim().length < 10) e.content = 'Content must be at least 10 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // AI Compose handler
  async function handleAiCompose() {
    if (!roughText.trim()) {
      toast.error('Please type some notes first')
      return
    }

    setComposing(true)
    try {
      const res = await fetch('/api/ai/compose-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: roughText.trim() }),
      })

      if (!res.ok) throw new Error('Compose failed')
      const data = await res.json()

      setTitle(data.title || '')
      setContent(data.content || '')
      setPriority(data.suggested_priority || 'normal')
      setIsPinned(data.suggested_pin || false)
      setHindiTitle(data.hindi_title || '')
      setHindiContent(data.hindi_content || '')
      setComposed(true)
      toast.success('Announcement composed! Review and publish.')
    } catch {
      toast.error('AI compose failed. Try manual mode.')
    } finally {
      setComposing(false)
    }
  }

  // Translate individual field via MCP
  async function handleTranslate(text: string, setter: (val: string) => void) {
    try {
      const res = await fetch('/api/mcp/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'translate_to_hindi',
          arguments: { text, context: 'announcement' },
        }),
      })

      if (!res.ok) throw new Error('Translation failed')
      const data = await res.json()
      setter(data.result?.text || '')
    } catch {
      toast.error('Translation failed')
    }
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
      {/* Mode toggle */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => { setMode('ai'); if (!composed) { setTitle(''); setContent('') } }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            mode === 'ai'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wand2 className="h-4 w-4" />
          AI Compose
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            mode === 'manual'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PenLine className="h-4 w-4" />
          Manual
        </button>
      </div>

      {/* AI Compose Panel */}
      {mode === 'ai' && !composed && (
        <Card className="border-dashed border-2 border-teal-200 bg-teal-50/30">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-100 text-teal-600 shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">AI Announcement Composer</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Type rough notes — AI will compose a professional, bilingual (English + Hindi) announcement with auto-suggested priority.
                </p>
              </div>
            </div>

            <Textarea
              placeholder={'e.g. "water tank cleaning tmrw 10am-2pm no water"\n\nor\n\n"holi celebration march 14 clubhouse, colors music snacks, kids 10am adults 12pm"'}
              rows={5}
              value={roughText}
              onChange={(e) => setRoughText(e.target.value)}
              className="bg-white"
            />

            <Button
              onClick={handleAiCompose}
              loading={composing}
              icon={<Sparkles className="h-4 w-4" />}
              disabled={!roughText.trim()}
              className="w-full"
            >
              {composing ? 'Composing with AI...' : 'Compose Announcement'}
            </Button>

            {composing && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs text-teal-600 font-medium">AI is composing your announcement + Hindi translation...</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* AI Composed success banner */}
      {mode === 'ai' && composed && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
          <Sparkles className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 flex-1">
            Announcement composed with AI! Review, edit, and publish below.
          </p>
          <button
            onClick={() => { setComposed(false); setTitle(''); setContent(''); setHindiTitle(''); setHindiContent('') }}
            className="text-xs text-green-600 hover:text-green-800 font-medium"
          >
            Start over
          </button>
        </div>
      )}

      {(mode === 'manual' || composed) && (
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Preview {showHindi ? '(Hindi)' : '(English)'}
                </p>
                {(hindiTitle || hindiContent) && (
                  <button
                    type="button"
                    onClick={() => setShowHindi(!showHindi)}
                    className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
                  >
                    <Languages className="h-3.5 w-3.5" />
                    {showHindi ? 'Show English' : 'Show Hindi'}
                  </button>
                )}
              </div>
              {showHindi ? (
                <>
                  {hindiTitle && (
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {hindiTitle}
                    </h3>
                  )}
                  {hindiContent && (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {hindiContent}
                    </p>
                  )}
                  {!hindiTitle && !hindiContent && (
                    <p className="text-sm text-gray-400 italic">No Hindi translation yet. Use AI Compose or click Translate below.</p>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}

          {/* Translate button (if manual mode or missing Hindi) */}
          {title.trim() && content.trim() && !hindiTitle && (
            <button
              type="button"
              onClick={() => {
                handleTranslate(title, setHindiTitle)
                handleTranslate(content, setHindiContent)
                toast.success('Translating to Hindi via MCP...')
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100 transition-colors w-full justify-center"
            >
              <Languages className="h-4 w-4" />
              Translate to Hindi (MCP)
            </button>
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
      )}
    </div>
  )
}
