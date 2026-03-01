'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  User,
  Home,
  FileText,
  Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore, useDemoStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { formatTime, getPassTypeLabel } from '@/lib/utils'
import type { VisitorPass, PassStatus } from '@/lib/types'
import Button from '@/components/ui/Button'

type VerifyResult =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'found'; pass: VisitorPass }
  | { state: 'not_found' }

export default function VerifyPassPage() {
  const router = useRouter()
  const { currentMember, isDemoMode } = useAppStore()
  const demoStore = useDemoStore()

  const [code, setCode] = useState('')
  const [result, setResult] = useState<VerifyResult>({ state: 'idle' })
  const [approving, setApproving] = useState(false)

  const handleVerify = useCallback(async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      toast.error('Enter a pass code')
      return
    }

    setResult({ state: 'loading' })

    if (isDemoMode) {
      if (!demoStore.initialized) demoStore.initialize()
      const found = demoStore.passes.find(
        (p) => (p as unknown as VisitorPass).pass_code === trimmed
      ) as unknown as VisitorPass | undefined

      if (found) {
        setResult({ state: 'found', pass: found })
      } else {
        setResult({ state: 'not_found' })
      }
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('visitor_passes')
        .select(`
          *,
          creator:members!created_by(full_name, flat_number, role, avatar_url)
        `)
        .eq('pass_code', trimmed)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setResult({ state: 'found', pass: data as VisitorPass })
      } else {
        setResult({ state: 'not_found' })
      }
    } catch (err) {
      console.error('Verification error:', err)
      toast.error('Error verifying pass')
      setResult({ state: 'not_found' })
    }
  }, [code, isDemoMode, demoStore])

  const handleApproveEntry = useCallback(async () => {
    if (result.state !== 'found') return
    setApproving(true)

    const now = new Date().toISOString()

    if (isDemoMode) {
      // Update in local state
      setResult({
        state: 'found',
        pass: {
          ...result.pass,
          status: 'used' as PassStatus,
          verified_at: now,
          verified_by: currentMember?.id || 'demo-guard',
        },
      })
      toast.success('Entry approved!')
      setApproving(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('visitor_passes')
        .update({
          status: 'used',
          verified_at: now,
          verified_by: currentMember?.id,
        })
        .eq('id', result.pass.id)

      if (error) throw error

      setResult({
        state: 'found',
        pass: {
          ...result.pass,
          status: 'used' as PassStatus,
          verified_at: now,
          verified_by: currentMember?.id || null,
        },
      })
      toast.success('Entry approved!')
    } catch {
      toast.error('Failed to approve entry')
    } finally {
      setApproving(false)
    }
  }, [result, isDemoMode, currentMember])

  const handleReset = () => {
    setCode('')
    setResult({ state: 'idle' })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify()
  }

  const pass = result.state === 'found' ? result.pass : null
  const creator = pass?.creator as
    | { full_name: string; flat_number: string }
    | undefined

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/security')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-teal-600" />
            Verify Pass
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Enter the visitor&apos;s pass code to verify
          </p>
        </div>
      </div>

      {/* Code input */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <label className="block text-sm font-medium text-gray-600 text-center">
          Enter Pass Code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="e.g. XK7M2N"
          maxLength={10}
          className="block w-full text-center font-mono text-4xl font-bold tracking-[0.35em] text-gray-900 border-2 border-gray-200 rounded-xl px-4 py-5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-gray-300 placeholder:tracking-[0.2em] placeholder:text-2xl"
          autoFocus
          autoComplete="off"
        />
        <Button
          onClick={handleVerify}
          className="w-full"
          size="lg"
          loading={result.state === 'loading'}
          icon={<Search className="h-5 w-5" />}
        >
          Verify
        </Button>
      </div>

      {/* Result */}
      {result.state === 'not_found' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center space-y-3">
          <ShieldX className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-red-700">Invalid Pass Code</h2>
          <p className="text-red-600">
            No visitor pass found with this code. Please check and try again.
          </p>
          <Button variant="secondary" onClick={handleReset} className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {pass && (
        <div
          className={`rounded-2xl border-2 p-6 space-y-5 ${
            pass.status === 'active'
              ? 'bg-green-50 border-green-200'
              : pass.status === 'used'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {/* Status icon */}
          <div className="flex flex-col items-center text-center space-y-2">
            {pass.status === 'active' ? (
              <>
                <div className="relative">
                  <CheckCircle2 className="h-20 w-20 text-green-500" />
                  <div className="absolute inset-0 h-20 w-20 rounded-full bg-green-400/20 animate-ping" />
                </div>
                <h2 className="text-2xl font-bold text-green-700">
                  Valid Pass
                </h2>
              </>
            ) : pass.status === 'used' ? (
              <>
                <Clock className="h-20 w-20 text-blue-500" />
                <h2 className="text-2xl font-bold text-blue-700">
                  Already Used
                </h2>
                <p className="text-blue-600 text-sm">
                  This pass has already been verified
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-20 w-20 text-red-500" />
                <h2 className="text-2xl font-bold text-red-700">
                  {pass.status === 'expired' ? 'Expired' : 'Cancelled'}
                </h2>
                <p className="text-red-600 text-sm">
                  This pass is no longer valid
                </p>
              </>
            )}
          </div>

          {/* Visitor details */}
          <div className="bg-white/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3 text-lg">
              <User className="h-5 w-5 text-gray-500" />
              <span className="font-semibold text-gray-900">
                {pass.visitor_name}
              </span>
            </div>

            {pass.visitor_phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700 text-base">
                  {pass.visitor_phone}
                </span>
              </div>
            )}

            {creator?.flat_number && (
              <div className="flex items-center gap-3">
                <Home className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700 text-base">
                  Visiting {creator.flat_number}
                  <span className="text-gray-500">
                    {' '}
                    ({creator.full_name})
                  </span>
                </span>
              </div>
            )}

            {pass.purpose && (
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700 text-base">{pass.purpose}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700 text-base">
                {pass.expected_date}
                {pass.expected_time_start && (
                  <>
                    {' · '}
                    {formatTime(pass.expected_time_start)}
                    {pass.expected_time_end &&
                      ` – ${formatTime(pass.expected_time_end)}`}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700 text-base">
                {getPassTypeLabel(pass.pass_type)} ·{' '}
                {pass.is_one_time ? 'One-time' : 'Multi-use'}
              </span>
            </div>
          </div>

          {/* Actions */}
          {pass.status === 'active' && (
            <Button
              onClick={handleApproveEntry}
              loading={approving}
              size="lg"
              className="w-full text-lg"
              icon={<CheckCircle2 className="h-5 w-5" />}
            >
              Approve Entry
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={handleReset}
            className="w-full"
          >
            Verify Another
          </Button>
        </div>
      )}
    </div>
  )
}
