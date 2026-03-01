'use client'

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  Send,
  Hash,
  ChevronLeft,
  MessageCircle,
  Users,
  Bot,
  ShoppingBag,
  Trophy,
  Sparkles,
  X,
  Check,
  Loader2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import type { Channel, Message } from '@/lib/types'
import { Avatar } from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'

const channelIcons: Record<string, string> = {
  General: '💬',
  'Buy & Sell': '🛒',
  Services: '🔧',
  'Food Corner': '🍛',
  Sports: '🏏',
  Maintenance: '🏗️',
}

export default function ChatPage() {
  const { currentMember, currentSociety } = useAppStore()

  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [composerText, setComposerText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showChannelList, setShowChannelList] = useState(true) // mobile toggle

  // AI Agent states
  const [aiBookingText, setAiBookingText] = useState('')
  const [aiBookingLoading, setAiBookingLoading] = useState(false)
  const [aiBookingResult, setAiBookingResult] = useState<{
    success: boolean
    agent_response: string
  } | null>(null)
  const [showBookingAgent, setShowBookingAgent] = useState(false)

  // Chat-to-Listing detection
  const [listingDetection, setListingDetection] = useState<{
    message: string
    data: {
      title: string
      description: string
      category: string
      price: number | null
      tags: string[]
    }
  } | null>(null)
  const [creatingListing, setCreatingListing] = useState(false)

  // Channel sidebar previews (last message per channel)
  const [channelPreviews, setChannelPreviews] = useState<Record<string, Message>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentMemberId = currentMember?.id

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) || null,
    [channels, activeChannelId]
  )

  // ── Fetch channels ───────────────────────────────────────────────
  useEffect(() => {
    async function loadChannels() {
      setLoading(true)

      try {
        const supabase = createClient()
        const societyId = currentSociety?.id
        if (!societyId) return

        const { data, error } = await supabase
          .from('channels')
          .select('*')
          .eq('society_id', societyId)
          .order('created_at', { ascending: true })

        if (error) throw error

        const chs = (data || []) as Channel[]
        setChannels(chs)
        if (chs.length > 0) setActiveChannelId(chs[0].id)

        // Fetch last message per channel for sidebar previews
        const previews: Record<string, Message> = {}
        await Promise.all(
          chs.map(async (ch) => {
            const { data: msgs } = await supabase
              .from('messages')
              .select('*, sender:members!sender_id(full_name, flat_number, avatar_url)')
              .eq('channel_id', ch.id)
              .order('created_at', { ascending: false })
              .limit(1)
            if (msgs && msgs.length > 0) {
              previews[ch.id] = msgs[0] as Message
            }
          })
        )
        setChannelPreviews(previews)
      } catch (err) {
        console.error('Failed to load channels:', err)
        toast.error('Failed to load channels')
      } finally {
        setLoading(false)
      }
    }

    loadChannels()
  }, [currentSociety?.id])

  // ── Fetch messages for active channel ────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:members!sender_id(full_name, flat_number, avatar_url)')
        .eq('channel_id', activeChannelId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) throw error
      setMessages((data || []) as Message[])
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }, [activeChannelId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // ── Realtime subscription (Supabase mode) ────────────────────────
  useEffect(() => {
    if (!activeChannelId) return

    const supabase = createClient()
    const subscription = supabase
      .channel(`messages:${activeChannelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${activeChannelId}`,
        },
        async (payload) => {
          // Fetch sender info for the new message
          const { data } = await supabase
            .from('members')
            .select('full_name, flat_number, avatar_url')
            .eq('id', payload.new.sender_id)
            .single()

          const newMsg = {
            ...payload.new,
            sender: data,
          } as Message

          setMessages((prev) => [...prev, newMsg])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [activeChannelId])

  // ── Auto-scroll to bottom ────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ─────────────────────────────────────────────────
  async function handleSend() {
    const text = composerText.trim()
    if (!text || !activeChannelId) return

    setSending(true)
    setComposerText('')

    try {
      const supabase = createClient()
      const { error } = await supabase.from('messages').insert({
        channel_id: activeChannelId,
        sender_id: currentMember?.id,
        content: text,
      })

      if (error) throw error

      // Update sidebar preview for this channel with optimistic data
      if (activeChannelId && currentMember) {
        const optimisticMsg: Message = {
          id: 'temp-' + Date.now(),
          channel_id: activeChannelId,
          sender_id: currentMember.id,
          content: text,
          created_at: new Date().toISOString(),
          sender: {
            full_name: currentMember.full_name,
            flat_number: currentMember.flat_number,
            avatar_url: currentMember.avatar_url,
          } as Member,
        }
        setChannelPreviews((prev) => ({ ...prev, [activeChannelId]: optimisticMsg }))
      }

      // AI Agent: Detect listing-like messages in marketplace channels
      const channelName = activeChannel?.name || ''
      const isMarketplaceChannel = ['Buy & Sell', 'Services', 'Food Corner'].includes(channelName)
      if (isMarketplaceChannel && text.length > 20) {
        detectListing(text)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      toast.error('Failed to send message')
      setComposerText(text) // restore text on failure
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  // ── AI Agent: Court Booking ──────────────────────────────────────
  async function handleAiBooking() {
    const text = aiBookingText.trim()
    if (!text || !currentSociety?.id || !currentMember?.id) return

    setAiBookingLoading(true)
    setAiBookingResult(null)

    try {
      const res = await fetch('/api/ai/book-court', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          society_id: currentSociety.id,
          member_id: currentMember.id,
        }),
      })

      const data = await res.json()
      setAiBookingResult({
        success: data.success || false,
        agent_response: data.agent_response || data.error || 'Something went wrong',
      })

      if (data.success) {
        toast.success('Court booked via AI Agent!')
        // Post a confirmation message in the Sports channel
        const sportsChannel = channels.find((c: Channel) => c.name === 'Sports')
        if (sportsChannel) {
          const supabase = createClient()
          await supabase.from('messages').insert({
            channel_id: sportsChannel.id,
            sender_id: currentMember.id,
            content: `🤖 AI Agent booked: ${data.agent_response?.split('\n')[0] || 'Court booked!'}`,
          })
        }
      }
    } catch {
      setAiBookingResult({
        success: false,
        agent_response: 'Failed to connect to booking agent. Please try again.',
      })
    } finally {
      setAiBookingLoading(false)
    }
  }

  // ── AI Agent: Detect Listing in Chat ─────────────────────────────
  async function detectListing(text: string) {
    try {
      const res = await fetch('/api/ai/chat-to-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, action: 'detect' }),
      })

      const data = await res.json()
      if (data.is_listing && data.confidence > 50 && data.data) {
        setListingDetection({ message: text, data: data.data })
      }
    } catch {
      // Silent fail — detection is a nice-to-have
    }
  }

  // ── AI Agent: Create Listing from Chat ───────────────────────────
  async function handleCreateListingFromChat() {
    if (!listingDetection || !currentMember?.id || !currentSociety?.id) return

    setCreatingListing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('listings').insert({
        society_id: currentSociety.id,
        author_id: currentMember.id,
        title: listingDetection.data.title,
        description: listingDetection.data.description,
        category: listingDetection.data.category,
        price: listingDetection.data.price,
        images: [],
        tags: listingDetection.data.tags || [],
        status: 'active',
        ai_extracted: { source: 'chat_agent', original_message: listingDetection.message },
      })

      if (error) throw error
      toast.success('Listing created from your chat message!')
      setListingDetection(null)
    } catch {
      toast.error('Failed to create listing')
    } finally {
      setCreatingListing(false)
    }
  }

  // Handle Enter to send, Shift+Enter for newline
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  function handleComposerChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComposerText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  // ── Get last message for a channel (for sidebar preview) ─────────
  function getLastMessage(channelId: string): Message | undefined {
    // For the active channel, check both live messages and cached preview
    if (channelId === activeChannelId && messages.length > 0) {
      return messages[messages.length - 1]
    }
    return channelPreviews[channelId]
  }

  // ── Format chat timestamp ────────────────────────────────────────
  function formatChatTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const isToday = d.toDateString() === now.toDateString()

    if (isToday) {
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
    if (diffMs < 86400000 * 2) return 'Yesterday'
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  // ── Select channel ──────────────────────────────────────────────
  function selectChannel(channelId: string) {
    setActiveChannelId(channelId)
    setShowChannelList(false) // on mobile, switch to messages view
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
        <div className="w-80 border-r border-gray-200 p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg" />
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="h-8 bg-gray-100 rounded w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 bg-gray-100 rounded-full shrink-0" />
                <div className="h-16 bg-gray-100 rounded-lg w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* ───── Channel sidebar ───── */}
      <div
        className={`${
          showChannelList ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 bg-gray-50/50`}
      >
        {/* Sidebar header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-teal-600" />
            Channels
          </h2>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto">
          {channels.map((ch) => {
            const lastMsg = getLastMessage(ch.id)
            const isActive = ch.id === activeChannelId
            const sender = lastMsg?.sender as unknown as {
              full_name: string
              flat_number: string
            } | undefined

            return (
              <button
                key={ch.id}
                onClick={() => selectChannel(ch.id)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b border-gray-100 ${
                  isActive
                    ? 'bg-teal-50 border-l-3 border-l-teal-600'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-xl shrink-0 mt-0.5">
                  {channelIcons[ch.name] || '💬'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        isActive ? 'text-teal-700' : 'text-gray-900'
                      }`}
                    >
                      {ch.name}
                    </span>
                    {lastMsg && (
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {formatChatTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                  {lastMsg ? (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      <span className="font-medium">
                        {sender?.flat_number || ''}:
                      </span>{' '}
                      {(lastMsg.content || '').slice(0, 50)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-0.5">
                      No messages yet
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ───── Messages area ───── */}
      <div
        className={`${
          showChannelList ? 'hidden' : 'flex'
        } md:flex flex-col flex-1 min-w-0`}
      >
        {activeChannel ? (
          <>
            {/* Messages header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
              <button
                onClick={() => setShowChannelList(true)}
                className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">
                  {channelIcons[activeChannel.name] || '💬'}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-gray-400" />
                    {activeChannel.name}
                  </h3>
                  {activeChannel.description && (
                    <p className="text-xs text-gray-400 truncate">
                      {activeChannel.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="h-3.5 w-3.5" />
                <span>{channels.length} channels</span>
              </div>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gradient-to-b from-gray-50/30 to-white">
              {messages.length === 0 && (
                <EmptyState
                  icon={<MessageCircle />}
                  title="No messages yet"
                  description={`Be the first to say something in #${activeChannel.name}!`}
                />
              )}

              {messages.map((msg, idx) => {
                const sender = msg.sender as unknown as {
                  full_name: string
                  flat_number: string
                  avatar_url?: string | null
                } | undefined

                const isOwn = msg.sender_id === currentMemberId
                const prevMsg = idx > 0 ? messages[idx - 1] : null
                const showAvatar =
                  !prevMsg || prevMsg.sender_id !== msg.sender_id

                // Date separator
                const showDateSep =
                  idx === 0 ||
                  new Date(msg.created_at).toDateString() !==
                    new Date(messages[idx - 1].created_at).toDateString()

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSep && (
                      <div className="flex items-center justify-center py-3">
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                          {new Date(msg.created_at).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex ${
                        isOwn ? 'justify-end' : 'justify-start'
                      } ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
                    >
                      {/* Other user avatar */}
                      {!isOwn && showAvatar && (
                        <div className="shrink-0 mr-2 mt-auto">
                          <Avatar
                            name={sender?.full_name || 'User'}
                            src={sender?.avatar_url}
                            size="sm"
                          />
                        </div>
                      )}
                      {!isOwn && !showAvatar && (
                        <div className="w-8 mr-2 shrink-0" />
                      )}

                      <div
                        className={`max-w-[75%] sm:max-w-[65%] ${
                          isOwn ? 'items-end' : 'items-start'
                        }`}
                      >
                        {/* Sender name */}
                        {!isOwn && showAvatar && (
                          <p className="text-xs font-semibold text-gray-700 mb-0.5 ml-1">
                            {sender?.full_name || 'Unknown'}
                            {sender?.flat_number && (
                              <span className="text-gray-400 font-normal ml-1">
                                {sender.flat_number}
                              </span>
                            )}
                          </p>
                        )}

                        {/* Bubble */}
                        <div
                          className={`relative px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isOwn
                              ? 'bg-teal-600 text-white rounded-2xl rounded-br-md'
                              : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md'
                          }`}
                        >
                          {msg.content}
                          <span
                            className={`block text-[10px] mt-1 text-right ${
                              isOwn ? 'text-teal-200' : 'text-gray-400'
                            }`}
                          >
                            {formatChatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Listing Detection Banner */}
            {listingDetection && (
              <div className="px-4 py-3 border-t border-purple-200 bg-purple-50">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600 shrink-0 mt-0.5">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-800">AI detected a listing in your message</p>
                    <p className="text-xs text-purple-600 mt-0.5 truncate">
                      &ldquo;{listingDetection.data.title}&rdquo;
                      {listingDetection.data.price && ` — ₹${listingDetection.data.price.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleCreateListingFromChat}
                      disabled={creatingListing}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {creatingListing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Post to Bazaar
                    </button>
                    <button
                      onClick={() => setListingDetection(null)}
                      className="p-1 rounded-lg hover:bg-purple-100 text-purple-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Court Booking Agent Panel */}
            {showBookingAgent && (
              <div className="px-4 py-3 border-t border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800">AI Court Booking Agent</span>
                  <button
                    onClick={() => { setShowBookingAgent(false); setAiBookingResult(null) }}
                    className="ml-auto p-1 rounded-lg hover:bg-amber-100 text-amber-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <input
                    type="text"
                    value={aiBookingText}
                    onChange={(e) => setAiBookingText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAiBooking() }}
                    placeholder='e.g. "Book badminton court tomorrow evening"'
                    className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    disabled={aiBookingLoading}
                  />
                  <button
                    onClick={handleAiBooking}
                    disabled={!aiBookingText.trim() || aiBookingLoading}
                    className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      aiBookingText.trim() && !aiBookingLoading
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-amber-100 text-amber-400 cursor-not-allowed'
                    }`}
                  >
                    {aiBookingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {aiBookingResult && (
                  <div className={`mt-2 p-3 rounded-xl text-sm whitespace-pre-wrap ${
                    aiBookingResult.success
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {aiBookingResult.agent_response}
                  </div>
                )}
              </div>
            )}

            {/* Message composer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-2">
                {/* AI Agent toggle button */}
                {activeChannel?.name === 'Sports' && (
                  <button
                    onClick={() => setShowBookingAgent(!showBookingAgent)}
                    className={`shrink-0 p-2.5 rounded-full transition-all duration-150 ${
                      showBookingAgent
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-500'
                    }`}
                    title="AI Court Booking Agent"
                  >
                    <Bot className="h-5 w-5" />
                  </button>
                )}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={composerText}
                    onChange={handleComposerChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${activeChannel.name}...`}
                    rows={1}
                    className="block w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    style={{ maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!composerText.trim() || sending}
                  className={`shrink-0 p-2.5 rounded-full transition-all duration-150 ${
                    composerText.trim()
                      ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Shift+Enter</kbd> for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<MessageCircle />}
              title="Select a channel"
              description="Choose a channel from the sidebar to start chatting"
            />
          </div>
        )}
      </div>
    </div>
  )
}
