'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Sparkles,
  ArrowUpDown,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wrench,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore, useDemoStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import type { Listing } from '@/lib/types'
import {
  formatDate,
  getCategoryLabel,
  getCategoryIcon,
  getStatusColor,
  truncate,
  getInitials,
} from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Textarea } from '@/components/ui/Input'

type SortOption = 'newest' | 'price_asc' | 'price_desc'
type CategoryFilter = 'all' | 'buy_sell' | 'services' | 'food'

const categoryTabs: { id: CategoryFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <Store className="h-4 w-4" /> },
  { id: 'buy_sell', label: 'Buy & Sell', icon: <ShoppingBag className="h-4 w-4" /> },
  { id: 'services', label: 'Services', icon: <Wrench className="h-4 w-4" /> },
  { id: 'food', label: 'Food', icon: <UtensilsCrossed className="h-4 w-4" /> },
]

export default function BazaarPage() {
  const router = useRouter()
  const { currentMember, currentSociety, isDemoMode } = useAppStore()
  const demoStore = useDemoStore()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<SortOption>('newest')

  // AI Match modal
  const [matchModalOpen, setMatchModalOpen] = useState(false)
  const [matchQuery, setMatchQuery] = useState('')
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchResults, setMatchResults] = useState<
    Array<{ listing_id: string; score: number; reason: string }>
  >([])
  const [showMatchResults, setShowMatchResults] = useState(false)

  useEffect(() => {
    demoStore.initialize()
  }, [demoStore])

  useEffect(() => {
    fetchListings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, currentSociety])

  async function fetchListings() {
    setLoading(true)
    try {
      if (isDemoMode) {
        setListings(demoStore.listings as unknown as Listing[])
      } else {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('listings')
          .select('*, author:members!listings_author_id_fkey(id,full_name,flat_number,avatar_url,role)')
          .eq('society_id', currentSociety?.id ?? '')
          .order('created_at', { ascending: false })

        if (error) throw error
        setListings((data as unknown as Listing[]) || [])
      }
    } catch {
      toast.error('Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = [...listings]

    // Category filter
    if (category !== 'all') {
      result = result.filter((l) => l.category === category)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          (l.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    }

    // Sort
    switch (sort) {
      case 'newest':
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        break
      case 'price_asc':
        result.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
        break
      case 'price_desc':
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
        break
    }

    return result
  }, [listings, category, search, sort])

  async function handleAIMatch() {
    if (!matchQuery.trim()) return
    setMatchLoading(true)
    setShowMatchResults(false)

    try {
      const payload = {
        query: matchQuery.trim(),
        listings: listings
          .filter((l) => l.status === 'active')
          .map((l) => ({
            id: l.id,
            title: l.title,
            description: l.description || '',
            category: l.category,
            tags: l.tags || [],
          })),
      }

      const res = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Match failed')
      const data = await res.json()
      setMatchResults(data.matches || [])
      setShowMatchResults(true)
    } catch {
      toast.error('AI matching failed. Try again later.')
    } finally {
      setMatchLoading(false)
    }
  }

  function getListingById(id: string) {
    return listings.find((l) => l.id === id)
  }

  function getStatusBadgeVariant(
    status: string
  ): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
    switch (status) {
      case 'active':
        return 'success'
      case 'sold':
        return 'info'
      case 'expired':
        return 'error'
      default:
        return 'neutral'
    }
  }

  const emptyMessages: Record<CategoryFilter, { title: string; desc: string }> = {
    all: {
      title: 'No listings yet',
      desc: 'Be the first to post something in your society bazaar!',
    },
    buy_sell: {
      title: 'No items for sale',
      desc: 'Got something to sell? Post it here for your neighbours!',
    },
    services: {
      title: 'No service listings',
      desc: 'Know a great plumber, cook, or tutor? Share with your society!',
    },
    food: {
      title: 'No food listings',
      desc: 'Homemade delicacies? Weekend specials? Post here!',
    },
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bazaar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Buy, sell, and discover services in your society
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => {
              setMatchModalOpen(true)
              setShowMatchResults(false)
              setMatchQuery('')
              setMatchResults([])
            }}
          >
            AI Match
          </Button>
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/dashboard/bazaar/create')}
          >
            Post Listing
          </Button>
        </div>
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search listings..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto" role="tablist">
        {categoryTabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={category === tab.id}
            onClick={() => setCategory(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors duration-150 ${
              category === tab.id
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title={emptyMessages[category].title}
          description={
            search.trim()
              ? `No results for "${search}". Try a different search term.`
              : emptyMessages[category].desc
          }
          actionLabel="Post Listing"
          onAction={() => router.push('/dashboard/bazaar/create')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((listing) => (
            <Card
              key={listing.id}
              className="hover:border-teal-200 transition-all duration-200"
              padding={false}
              onClick={() => router.push(`/dashboard/bazaar/${listing.id}`)}
            >
              <div className="p-5">
                {/* Top row: category + status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <span>{getCategoryIcon(listing.category)}</span>
                    {getCategoryLabel(listing.category)}
                  </span>
                  <Badge variant={getStatusBadgeVariant(listing.status)} dot>
                    {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                  </Badge>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">
                  {listing.title}
                </h3>

                {/* Description */}
                {listing.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {truncate(listing.description, 120)}
                  </p>
                )}

                {/* Price */}
                {listing.price != null && (
                  <p className="text-lg font-bold text-teal-600 mb-3">
                    ₹{listing.price.toLocaleString('en-IN')}
                  </p>
                )}

                {/* Tags */}
                {listing.tags && listing.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {listing.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {listing.tags.length > 4 && (
                      <span className="text-xs text-gray-400">
                        +{listing.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer: author + time */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-teal-100 text-teal-700 text-[10px] font-semibold">
                      {getInitials(
                        (listing.author as unknown as { full_name: string })?.full_name || 'U'
                      )}
                    </span>
                    <span className="text-xs text-gray-600">
                      {(listing.author as unknown as { full_name: string })?.full_name || 'Unknown'}
                      {(listing.author as unknown as { flat_number: string })?.flat_number && (
                        <span className="text-gray-400">
                          {' · '}
                          {(listing.author as unknown as { flat_number: string }).flat_number}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(listing.created_at)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* AI Match Modal */}
      <Modal
        open={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        title="✨ AI Smart Match"
        size="lg"
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Describe what you&apos;re looking for, and our AI will find the best
            matches from current listings.
          </p>
          <Textarea
            placeholder='e.g. "I need a good cook who can make South Indian food" or "Looking for a second-hand study table"'
            rows={3}
            value={matchQuery}
            onChange={(e) => setMatchQuery(e.target.value)}
          />
          <Button
            onClick={handleAIMatch}
            loading={matchLoading}
            icon={<Sparkles className="h-4 w-4" />}
            disabled={!matchQuery.trim()}
            className="w-full"
          >
            Find Matches
          </Button>

          {showMatchResults && (
            <div className="space-y-3 pt-2">
              {matchResults.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No matching listings found. Try a different description.
                </p>
              ) : (
                matchResults.map((match) => {
                  const listing = getListingById(match.listing_id)
                  if (!listing) return null
                  return (
                    <div
                      key={match.listing_id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-teal-200 cursor-pointer transition-colors"
                      onClick={() => {
                        setMatchModalOpen(false)
                        router.push(`/dashboard/bazaar/${listing.id}`)
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {listing.title}
                          </span>
                          {listing.price != null && (
                            <span className="text-sm font-bold text-teal-600 shrink-0">
                              ₹{listing.price.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {match.reason}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold ${
                            match.score >= 70
                              ? 'bg-green-100 text-green-700'
                              : match.score >= 40
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {match.score}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
