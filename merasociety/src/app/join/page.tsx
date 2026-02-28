'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Building2, KeyRound, User, Home, Phone, Search, CheckCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Society } from '@/lib/types'

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
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
