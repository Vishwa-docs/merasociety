'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Sparkles,
  Send,
  X,
  Wand2,
  PenLine,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import type { ListingCategory } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { getCategoryLabel, getCategoryIcon } from '@/lib/utils'

type Mode = 'smart' | 'manual'

const CATEGORY_OPTIONS = [
  { value: 'buy_sell', label: '🛒 Buy & Sell' },
  { value: 'services', label: '🔧 Services' },
  { value: 'food', label: '🍽️ Food' },
]

export default function CreateListingPage() {
  const router = useRouter()
  const { currentMember, currentSociety } = useAppStore()

  const [mode, setMode] = useState<Mode>('smart')

  // Smart mode state
  const [rawText, setRawText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState(false)

  // Form fields (shared between smart-extracted and manual)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ListingCategory>('buy_sell')
  const [price, setPrice] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [contactInfo, setContactInfo] = useState('')

  const [submitting, setSubmitting] = useState(false)

  async function handleExtract() {
    if (!rawText.trim()) {
      toast.error('Please paste some text first')
      return
    }

    setExtracting(true)
    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText.trim() }),
      })

      if (!res.ok) throw new Error('Extraction failed')
      const data = await res.json()

      setTitle(data.title || '')
      setDescription(data.description || '')
      setCategory(data.category || 'buy_sell')
      setPrice(data.price != null ? String(data.price) : '')
      setTags(data.tags || [])
      setExtracted(true)
      toast.success('Data extracted! Review and submit.')
    } catch {
      toast.error('AI extraction failed. Try manual mode.')
    } finally {
      setExtracting(false)
    }
  }

  function addTag(value: string) {
    const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (cleaned && !tags.includes(cleaned) && tags.length < 8) {
      setTags([...tags, cleaned])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  function resetForm() {
    setTitle('')
    setDescription('')
    setCategory('buy_sell')
    setPrice('')
    setTags([])
    setContactInfo('')
    setRawText('')
    setExtracted(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    setSubmitting(true)
    try {
      if (!currentMember?.id || !currentSociety?.id) {
        toast.error('Unable to determine your membership. Please reload.')
        setSubmitting(false)
        return
      }

      const listingData = {
        society_id: currentSociety.id,
        author_id: currentMember.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        price: price ? parseFloat(price) : null,
        images: [],
        tags,
        status: 'active' as const,
        contact_info: contactInfo.trim() || null,
        ai_extracted: extracted ? { source: 'smart_mode', raw_text: rawText } : null,
      }

      const supabase = createClient()
      const { error } = await supabase.from('listings').insert(listingData)
      if (error) throw error

      toast.success('Listing posted successfully!')
      router.push('/dashboard/bazaar')
    } catch {
      toast.error('Failed to post listing')
    } finally {
      setSubmitting(false)
    }
  }

  const isFormValid = title.trim().length > 0

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/dashboard/bazaar')}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Post a Listing</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Share with your society neighbours
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => {
            setMode('smart')
            if (!extracted) resetForm()
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            mode === 'smart'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wand2 className="h-4 w-4" />
          Smart Mode
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
          Manual Mode
        </button>
      </div>

      {/* Smart Mode: Paste + Extract */}
      {mode === 'smart' && !extracted && (
        <Card className="mb-6 border-dashed border-2 border-teal-200 bg-teal-50/30">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-100 text-teal-600 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  AI Smart Extract
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Paste your WhatsApp message, informal text, or any description —
                  our AI will extract structured listing data automatically.
                </p>
              </div>
            </div>

            <Textarea
              placeholder={`e.g. "Selling my Samsung washing machine, 2 years old, works perfectly. 8000 rs. DM me if interested. Self pickup from B-302."\n\nor\n\n"Anyone need a cook? Lakshmi aunty is looking for 2 more houses. South Indian + North Indian. Very hygienic. 4000/month."`}
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="bg-white"
            />

            <Button
              onClick={handleExtract}
              loading={extracting}
              icon={<Sparkles className="h-4 w-4" />}
              disabled={!rawText.trim()}
              className="w-full"
            >
              {extracting ? 'Extracting with AI...' : 'Extract Listing Data'}
            </Button>

            {extracting && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs text-teal-600 font-medium">
                  AI is parsing your message...
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Smart Mode: Extracted preview banner */}
      {mode === 'smart' && extracted && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg bg-green-50 border border-green-200">
          <Check className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 flex-1">
            Data extracted successfully! Review and edit below, then submit.
          </p>
          <button
            onClick={() => {
              setExtracted(false)
              resetForm()
            }}
            className="text-xs text-green-600 hover:text-green-800 font-medium"
          >
            Start over
          </button>
        </div>
      )}

      {/* Form (Manual mode, or Smart mode after extraction) */}
      {(mode === 'manual' || extracted) && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Card>
            <div className="space-y-4">
              <Input
                label="Title"
                placeholder="e.g. Samsung 7kg Washing Machine"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Textarea
                label="Description"
                placeholder="Describe your listing in detail..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <Select
                label="Category"
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(e) => setCategory(e.target.value as ListingCategory)}
              />

              {/* Price */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Price (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tags
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="p-0.5 hover:bg-teal-100 rounded-full transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={tags.length === 0 ? 'Type and press Enter to add tags...' : ''}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => {
                      if (tagInput.trim()) addTag(tagInput)
                    }}
                    className="flex-1 min-w-[120px] border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none py-1"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Press Enter or comma to add. Max 8 tags.
                </p>
              </div>

              {/* Contact info */}
              <Input
                label="Contact Info (optional)"
                placeholder="Phone number or preferred contact method"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
              />
            </div>
          </Card>

          {/* Preview card */}
          {title.trim() && (
            <Card className="border-teal-200 bg-teal-50/20">
              <div className="space-y-2">
                <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">
                  Preview
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{getCategoryIcon(category)}</span>
                  <span>{getCategoryLabel(category)}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                {description && (
                  <p className="text-sm text-gray-600">{description}</p>
                )}
                {price && (
                  <p className="text-lg font-bold text-teal-600">
                    ₹{parseInt(price).toLocaleString('en-IN')}
                  </p>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              loading={submitting}
              disabled={!isFormValid}
              icon={<Send className="h-4 w-4" />}
              className="flex-1 sm:flex-none"
            >
              Post Listing
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/dashboard/bazaar')}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
