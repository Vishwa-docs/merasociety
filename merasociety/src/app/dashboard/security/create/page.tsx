'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  ArrowLeft,
  Copy,
  Check,
  User,
  Phone,
  FileText,
  Calendar,
} from 'lucide-react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { generatePassCode, formatTime } from '@/lib/utils'
import type { PassType } from '@/lib/types'
import Card from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'

const passTypes: { value: PassType; label: string; emoji: string }[] = [
  { value: 'guest', label: 'Guest', emoji: '👤' },
  { value: 'contractor', label: 'Contractor', emoji: '🔧' },
  { value: 'delivery', label: 'Delivery', emoji: '📦' },
]

function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      options.push({ value: val, label: formatTime(val) })
    }
  }
  return options
}

const timeOptions = generateTimeOptions()

export default function CreatePassPage() {
  const router = useRouter()
  const { currentMember, currentSociety } = useAppStore()

  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [passType, setPassType] = useState<PassType>('guest')
  const [purpose, setPurpose] = useState('')
  const [expectedDate, setExpectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [timeStart, setTimeStart] = useState('09:00')
  const [timeEnd, setTimeEnd] = useState('18:00')
  const [isOneTime, setIsOneTime] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Success modal state
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdCode, setCreatedCode] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const isValid = visitorName.trim().length >= 2

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isValid || submitting) return

      setSubmitting(true)
      const passCode = generatePassCode()

      try {
        if (!currentMember?.id || !currentSociety?.id) {
          toast.error('Unable to determine your membership. Please reload.')
          setSubmitting(false)
          return
        }

        const passData = {
          society_id: currentSociety.id,
          created_by: currentMember.id,
          visitor_name: visitorName.trim(),
          visitor_phone: visitorPhone.trim() || null,
          pass_type: passType,
          pass_code: passCode,
          purpose: purpose.trim() || null,
          expected_date: expectedDate,
          expected_time_start: timeStart,
          expected_time_end: timeEnd,
          status: 'active' as const,
          is_one_time: isOneTime,
          created_at: new Date().toISOString(),
        }

        const supabase = createClient()
        const { error } = await supabase
          .from('visitor_passes')
          .insert(passData)

        if (error) throw error

        // Generate QR code for the success modal
        const qr = await QRCode.toDataURL(passCode, {
          width: 200,
          margin: 2,
          color: { dark: '#0d9488', light: '#ffffff' },
        })

        setCreatedCode(passCode)
        setQrDataUrl(qr)
        setShowSuccess(true)
        toast.success('Visitor pass created!')
      } catch (err) {
        console.error('Failed to create pass:', err)
        toast.error('Failed to create pass')
      } finally {
        setSubmitting(false)
      }
    },
    [
      isValid,
      submitting,
      visitorName,
      visitorPhone,
      passType,
      purpose,
      expectedDate,
      timeStart,
      timeEnd,
      isOneTime,
      currentMember,
      currentSociety,
    ]
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(createdCode)
      setCopied(true)
      toast.success('Pass code copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [createdCode])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
            <Shield className="h-6 w-6 text-teal-600" />
            Create Visitor Pass
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate a pass code for your visitor
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Visitor name */}
          <Input
            label="Visitor Name *"
            placeholder="Enter visitor's full name"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            icon={<User className="h-4 w-4" />}
          />

          {/* Visitor phone */}
          <Input
            label="Visitor Phone"
            type="tel"
            placeholder="Phone number (optional)"
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
            icon={<Phone className="h-4 w-4" />}
          />

          {/* Pass type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pass Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {passTypes.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setPassType(pt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 ${
                    passType === pt.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{pt.emoji}</span>
                  <span className="text-sm font-medium">{pt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <Input
            label="Purpose"
            placeholder="e.g., Family dinner, Pipe repair, Amazon delivery"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            icon={<FileText className="h-4 w-4" />}
          />

          {/* Expected date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Calendar className="h-4 w-4 inline mr-1.5 text-gray-400" />
              Expected Date
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Time window */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="From"
              options={timeOptions}
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
            />
            <Select
              label="To"
              options={timeOptions}
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
            />
          </div>

          {/* One-time toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isOneTime}
              onChange={(e) => setIsOneTime(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                One-time use
              </span>
              <p className="text-xs text-gray-500">
                Pass will be marked as used after first verification
              </p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/dashboard/security')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={!isValid}
              className="flex-1"
              icon={<Shield className="h-4 w-4" />}
            >
              Generate Pass
            </Button>
          </div>
        </form>
      </Card>

      {/* Success Modal — designed for screenshotting/sharing */}
      <Modal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false)
          router.push('/dashboard/security')
        }}
        title="Visitor Pass Created"
        size="sm"
      >
        <div className="flex flex-col items-center text-center space-y-5 py-2">
          {/* QR Code */}
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="Pass QR Code"
              className="h-48 w-48 rounded-xl border-2 border-teal-100 shadow-sm"
            />
          )}

          {/* Pass code */}
          <div>
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">
              Pass Code
            </p>
            <div className="font-mono text-4xl font-bold tracking-[0.3em] text-teal-700 bg-teal-50 px-6 py-3 rounded-xl border border-teal-200">
              {createdCode}
            </div>
          </div>

          {/* Visitor info */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium text-gray-900">{visitorName}</span>
              {visitorPhone && ` · ${visitorPhone}`}
            </p>
            <p>
              {expectedDate} · {formatTime(timeStart)} – {formatTime(timeEnd)}
            </p>
            {purpose && <p className="text-gray-500">{purpose}</p>}
          </div>

          {/* Share / Copy */}
          <Button
            onClick={handleCopy}
            icon={
              copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )
            }
            variant={copied ? 'secondary' : 'primary'}
            className="w-full"
          >
            {copied ? 'Copied!' : 'Copy Pass Code'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSuccess(false)
              router.push('/dashboard/security')
            }}
          >
            Done
          </Button>
        </div>
      </Modal>
    </div>
  )
}
