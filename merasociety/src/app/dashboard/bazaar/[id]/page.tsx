'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Share2,
  MessageCircle,
  CheckCircle,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  Phone,
  Tag,
  Calendar,
  IndianRupee,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import type { Listing } from '@/lib/types'
import {
  formatDate,
  getCategoryLabel,
  getCategoryIcon,
} from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { currentMember, currentSociety } = useAppStore()

  const listingId = params.id as string

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [similarListings, setSimilarListings] = useState<Listing[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [markingSold, setMarkingSold] = useState(false)

  useEffect(() => {
    fetchListing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId])

  async function fetchListing() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('listings')
        .select(
          '*, author:members!listings_author_id_fkey(id,full_name,flat_number,avatar_url,role,phone)'
        )
        .eq('id', listingId)
        .single()

      if (error) throw error
      setListing(data as unknown as Listing)
      fetchSimilar(data as unknown as Listing)
    } catch {
      toast.error('Listing not found')
      router.push('/dashboard/bazaar')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSimilar(current: Listing) {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('listings')
        .select(
          '*, author:members!listings_author_id_fkey(id,full_name,flat_number,avatar_url,role)'
        )
        .eq('society_id', currentSociety?.id || '')
        .eq('status', 'active')
        .neq('id', current.id)
        .eq('category', current.category)
        .limit(4)

      const allListings = (data as unknown as Listing[]) || []

      const similar = allListings
        .filter(
          (l) => l.id !== current.id && l.category === current.category
        )
        .slice(0, 4)

      setSimilarListings(similar)
    } catch {
      // silently ignore
    }
  }

  async function handleMarkSold() {
    if (!listing) return
    setMarkingSold(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('listings')
        .update({ status: 'sold', updated_at: new Date().toISOString() })
        .eq('id', listing.id)

      if (error) throw error
      setListing({ ...listing, status: 'sold' })
      toast.success('Listing marked as sold')
    } catch {
      toast.error('Failed to update listing')
    } finally {
      setMarkingSold(false)
    }
  }

  async function handleDelete() {
    if (!listing) return
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listing.id)

      if (error) throw error
      toast.success('Listing deleted')
      router.push('/dashboard/bazaar')
    } catch {
      toast.error('Failed to delete listing')
    } finally {
      setDeleting(false)
      setDeleteModalOpen(false)
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/dashboard/bazaar/${listingId}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard!')
  }

  const isAuthor =
    listing &&
    currentMember &&
    (listing.author_id === currentMember.id ||
      (listing.author as unknown as { id: string })?.id === currentMember.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!listing) return null

  const author = listing.author as unknown as {
    full_name: string
    flat_number: string
    avatar_url?: string | null
    phone?: string | null
    role: string
  }

  const aiExtracted = listing.ai_extracted as Record<string, unknown> | null

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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/bazaar')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bazaar
      </button>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: listing details */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="space-y-4">
              {/* Category + Status */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500">
                  <span className="text-base">{getCategoryIcon(listing.category)}</span>
                  {getCategoryLabel(listing.category)}
                </span>
                <Badge variant={getStatusBadgeVariant(listing.status)} dot>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </Badge>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>

              {/* Price */}
              {listing.price != null && (
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-teal-600" />
                  <span className="text-2xl font-bold text-teal-600">
                    {listing.price.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Description */}
              {listing.description && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {listing.tags && listing.tags.length > 0 && (
                <div className="flex items-start gap-2 pt-2">
                  <Tag className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {listing.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-600 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact info */}
              {listing.contact_info && (
                <div className="flex items-center gap-2 pt-2">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{listing.contact_info}</span>
                </div>
              )}

              {/* Posted date */}
              <div className="flex items-center gap-2 pt-2 text-xs text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                Posted {formatDate(listing.created_at)}
                {listing.updated_at !== listing.created_at && (
                  <span> · Updated {formatDate(listing.updated_at)}</span>
                )}
              </div>
            </div>
          </Card>

          {/* AI Insights Card */}
          {aiExtracted && Object.keys(aiExtracted).length > 0 && (
            <Card className="border-purple-200 bg-purple-50/30">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-purple-900">
                    AI Insights
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {'condition' in aiExtracted && aiExtracted.condition ? (
                    <div>
                      <span className="text-gray-500 text-xs">Condition</span>
                      <p className="text-gray-900 font-medium capitalize">
                        {String(aiExtracted.condition).replace('_', ' ')}
                      </p>
                    </div>
                  ) : null}
                  {'urgency' in aiExtracted && aiExtracted.urgency ? (
                    <div>
                      <span className="text-gray-500 text-xs">Urgency</span>
                      <p className="text-gray-900 font-medium capitalize">
                        {String(aiExtracted.urgency)}
                      </p>
                    </div>
                  ) : null}
                  {'source' in aiExtracted && aiExtracted.source ? (
                    <div>
                      <span className="text-gray-500 text-xs">Source</span>
                      <p className="text-gray-900 font-medium capitalize">
                        {String(aiExtracted.source).replace('_', ' ')}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          )}

          {/* Similar Listings */}
          {similarListings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Similar Listings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {similarListings.map((sim) => (
                  <Card
                    key={sim.id}
                    className="hover:border-teal-200 transition-all"
                    onClick={() => router.push(`/dashboard/bazaar/${sim.id}`)}
                  >
                    <div className="space-y-1.5">
                      <span className="text-xs text-gray-500">
                        {getCategoryIcon(sim.category)}{' '}
                        {getCategoryLabel(sim.category)}
                      </span>
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {sim.title}
                      </h4>
                      {sim.price != null && (
                        <p className="text-sm font-bold text-teal-600">
                          ₹{sim.price.toLocaleString('en-IN')}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {(sim.author as unknown as { full_name: string })?.full_name} ·{' '}
                        {formatDate(sim.created_at)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: seller card + actions */}
        <div className="space-y-4">
          {/* Seller card */}
          <Card>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Posted by
              </h3>
              <div className="flex items-center gap-3">
                <Avatar
                  name={author?.full_name || 'Unknown'}
                  src={author?.avatar_url}
                  size="lg"
                />
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {author?.full_name || 'Unknown'}
                  </p>
                  {author?.flat_number && (
                    <p className="text-sm text-gray-500">
                      Flat {author.flat_number}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact button */}
              <Button
                variant="primary"
                icon={<MessageCircle className="h-4 w-4" />}
                className="w-full"
                onClick={() => {
                  if (listing.contact_info) {
                    toast.success(`Contact: ${listing.contact_info}`)
                  } else {
                    router.push('/dashboard/chat')
                  }
                }}
              >
                Contact Seller
              </Button>
            </div>
          </Card>

          {/* Actions card */}
          <Card>
            <div className="space-y-2">
              <Button
                variant="secondary"
                icon={<Share2 className="h-4 w-4" />}
                className="w-full"
                onClick={handleShare}
              >
                Share Listing
              </Button>

              {isAuthor && listing.status === 'active' && (
                <Button
                  variant="secondary"
                  icon={<CheckCircle className="h-4 w-4" />}
                  className="w-full"
                  loading={markingSold}
                  onClick={handleMarkSold}
                >
                  Mark as Sold
                </Button>
              )}

              {isAuthor && (
                <>
                  <Button
                    variant="ghost"
                    icon={<Pencil className="h-4 w-4" />}
                    className="w-full"
                    onClick={() =>
                      toast('Edit feature coming soon!', { icon: '🚧' })
                    }
                  >
                    Edit Listing
                  </Button>
                  <Button
                    variant="danger"
                    icon={<Trash2 className="h-4 w-4" />}
                    className="w-full"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    Delete Listing
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Listing"
        size="sm"
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete &quot;{listing.title}&quot;? This action
            cannot be undone.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="danger"
              loading={deleting}
              onClick={handleDelete}
              className="flex-1"
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
