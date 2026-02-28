'use client'

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  Send,
  Hash,
  ChevronLeft,
  MessageCircle,
  Users,
} from 'lucide-react'
import { useAppStore, useDemoStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getInitials } from '@/lib/utils'
import type { Channel, Message } from '@/lib/types'
import { Avatar } from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'

// ── Demo channel data ──────────────────────────────────────────────
const DEMO_CHANNELS: Channel[] = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'General',
    description: 'General discussions for the society',
    type: 'general',
    listing_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'Buy & Sell',
    description: 'Buy and sell items within the society',
    type: 'topic',
    listing_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000203',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'Services',
    description: 'Share and find local service recommendations',
    type: 'topic',
    listing_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000204',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'Food Corner',
    description: 'Homemade food, tiffin services & recipes',
    type: 'topic',
    listing_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000205',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'Sports',
    description: 'Sports activities and court bookings chat',
    type: 'topic',
    listing_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000206',
    society_id: '00000000-0000-0000-0000-000000000001',
    name: 'Maintenance',
    description: 'Maintenance requests and updates',
    type: 'topic',
    listing_id: null,
    created_at: new Date().toISOString(),
  },
]

const channelIcons: Record<string, string> = {
  General: '💬',
  'Buy & Sell': '🛒',
  Services: '🔧',
  'Food Corner': '🍛',
  Sports: '🏏',
  Maintenance: '🏗️',
}

export default function ChatPage() {
  const { currentMember, currentSociety, isDemoMode } = useAppStore()
  const demoStore = useDemoStore()

  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [composerText, setComposerText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showChannelList, setShowChannelList] = useState(true) // mobile toggle

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentMemberId = currentMember?.id || 'demo-member-2' // demo user = Priya

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) || null,
    [channels, activeChannelId]
  )

  // ── Fetch channels ───────────────────────────────────────────────
  useEffect(() => {
    async function loadChannels() {
      setLoading(true)

      if (isDemoMode) {
        if (!demoStore.initialized) demoStore.initialize()
        setChannels(DEMO_CHANNELS)
        setActiveChannelId(DEMO_CHANNELS[0].id)
        setLoading(false)
        return
      }

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
      } catch (err) {
        console.error('Failed to load channels:', err)
      } finally {
        setLoading(false)
      }
    }

    loadChannels()
  }, [isDemoMode, currentSociety?.id, demoStore])

  // ── Fetch messages for active channel ────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) return

    if (isDemoMode) {
      const demoMsgs = demoStore.messages.filter(
        (m) => (m as unknown as Message).channel_id === activeChannelId
      ) as unknown as Message[]
      setMessages(demoMsgs)
      return
    }

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
  }, [activeChannelId, isDemoMode, demoStore.messages])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // ── Realtime subscription (Supabase mode) ────────────────────────
  useEffect(() => {
    if (isDemoMode || !activeChannelId) return

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
  }, [activeChannelId, isDemoMode])

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
      if (isDemoMode) {
        const newMsg: Record<string, unknown> = {
          id: `demo-msg-${Date.now()}`,
          channel_id: activeChannelId,
          sender_id: currentMemberId,
          content: text,
          created_at: new Date().toISOString(),
          sender: {
            full_name: currentMember?.full_name || 'Priya Sharma',
            flat_number: currentMember?.flat_number || 'B-302',
          },
        }
        demoStore.addItem('messages', newMsg)
        setMessages((prev) => [...prev, newMsg as unknown as Message])
        return
      }

      const supabase = createClient()
      const { error } = await supabase.from('messages').insert({
        channel_id: activeChannelId,
        sender_id: currentMember?.id,
        content: text,
      })

      if (error) throw error
      // Realtime will push the new message
    } catch (err) {
      console.error('Failed to send message:', err)
      setComposerText(text) // restore text on failure
    } finally {
      setSending(false)
      textareaRef.current?.focus()
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
    const allMsgs = isDemoMode
      ? (demoStore.messages as unknown as Message[])
      : messages
    return [...allMsgs]
      .filter((m) => m.channel_id === channelId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
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

            {/* Message composer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-2">
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
