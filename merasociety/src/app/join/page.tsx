'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Building2, KeyRound, User, Home, Phone, Search, CheckCircle, Clock, MapPin, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Society } from '@/lib/types'

interface PublicSociety {
  id: string
  name: string
  address: string | null
}

interface MemberStatus {
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  flat_number: string
}

export default function JoinPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [society, setSociety] = useState<Society | null>(null)
  const [existingMember, setExistingMember] = useState<MemberStatus | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [joined, setJoined] = useState(false)

  const [fullName, setFullName] = useState('')
  const [flatNumber, setFlatNumber] = useState('')
  const [phone, setPhone] = useState('')

  // Society browser state
  const [searchQuery, setSearchQuery] = useState('')
  const [publicSocieties, setPublicSocieties] = useState<PublicSociety[]>([])
  const [browseLoading, setBrowseLoading] = useState(true)

  // Load public societies list on mount
  useEffect(() => {
    async function loadSocieties() {
      try {
        const res = await fetch('/api/societies')
        const data = await res.json()
        if (data.societies) setPublicSocieties(data.societies)
      } catch {
        // Silently fail — the invite code form still works
      } finally {
        setBrowseLoading(false)
      }
    }
    loadSocieties()
  }, [])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code')
      return
    }

    setLookupLoading(true)
    setSociety(null)
    setExistingMember(null)

    try {
      const supabase = createClient()

      // Look up society by invite code
      const { data: societyData, error: societyError } = await supabase
        .from('societies')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single()

      if (societyError || !societyData) {
        toast.error('No society found with that invite code')
        setLookupLoading(false)
        return
      }

      setSociety(societyData)

      // Check if current user already has membership
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: memberData } = await supabase
          .from('members')
          .select('status, flat_number')
          .eq('user_id', user.id)
          .eq('society_id', societyData.id)
          .single()

        if (memberData) {
          setExistingMember(memberData)
        }
      }
    } catch {
      toast.error('Failed to look up society')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !flatNumber || !society) {
      toast.error('Please fill in all required fields')
      return
    }

    setJoinLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Please sign in first to join a society')
        setJoinLoading(false)
        return
      }

      const { error } = await supabase.from('members').insert({
        user_id: user.id,
        society_id: society.id,
        full_name: fullName,
        flat_number: flatNumber,
        phone: phone || null,
        role: 'resident',
        status: 'pending',
        is_verified: false,
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('You are already a member of this society')
        } else {
          toast.error('Failed to join. Please try again.')
        }
        setJoinLoading(false)
        return
      }

      setJoined(true)
      toast.success('Join request submitted!')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setJoinLoading(false)
    }
  }

  const filteredSocieties = publicSocieties.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-white px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Building2 className="h-8 w-8 text-teal-600" />
            <span className="text-2xl font-bold text-gray-900">MeraSociety</span>
          </Link>
          <p className="mt-2 text-gray-600">Join your apartment society</p>
        </div>

        {/* Lookup Card */}
        <Card className="mb-6">
          <form onSubmit={handleLookup} className="space-y-4">
            <Input
              label="Society Invite Code"
              type="text"
              placeholder="ABCD1234"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              helperText="Enter the invite code shared by your society admin"
            />
            <Button
              type="submit"
              loading={lookupLoading}
              className="w-full"
              icon={<Search className="h-4 w-4" />}
            >
              Look Up Society
            </Button>
          </form>
        </Card>

        {/* Browse Societies */}
        {!society && (
          <Card className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Or browse available societies</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or address…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            {browseLoading ? (
              <div className="flex items-center justify-center py-6 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredSocieties.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">No societies found</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {filteredSocieties.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full text-left rounded-lg border border-gray-100 p-3 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
                      onClick={() => {
                        toast('Ask your society admin for the invite code', { icon: '🔑' })
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                          {s.address && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{s.address}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* Society Found */}
        {society && (
          <Card className="mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                <Building2 className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{society.name}</h3>
                {society.address && (
                  <p className="text-sm text-gray-500">{society.address}</p>
                )}
              </div>
            </div>

            {/* Already a member */}
            {existingMember && (
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  {existingMember.status === 'approved' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    Status: <span className="capitalize">{existingMember.status}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Flat: {existingMember.flat_number}
                </p>
                {existingMember.status === 'approved' && (
                  <Link
                    href="/dashboard"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    Go to Dashboard →
                  </Link>
                )}
              </div>
            )}

            {/* Join Form */}
            {!existingMember && !joined && (
              <form onSubmit={handleJoin} className="space-y-4 mt-4 pt-4 border-t border-gray-100">
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="Priya Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  icon={<User className="h-4 w-4" />}
                  required
                />
                <Input
                  label="Flat Number"
                  type="text"
                  placeholder="A-101"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  icon={<Home className="h-4 w-4" />}
                  required
                />
                <Input
                  label="Phone (optional)"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  icon={<Phone className="h-4 w-4" />}
                />
                <Button
                  type="submit"
                  loading={joinLoading}
                  className="w-full"
                  size="lg"
                >
                  Request to Join
                </Button>
              </form>
            )}

            {/* Joined Successfully */}
            {joined && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-teal-600 mb-3" />
                <h4 className="font-semibold text-gray-900">Request Submitted!</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Your join request is pending admin approval. You&apos;ll be notified once approved.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Back link */}
        <div className="text-center text-sm text-gray-500">
          <Link href="/" className="text-teal-600 hover:text-teal-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
