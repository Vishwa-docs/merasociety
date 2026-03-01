'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Building2,
  Bell,
  LogOut,
  Save,
  Copy,
  Key,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function SettingsPage() {
  const router = useRouter()
  const { currentMember, currentSociety, isDemoMode } = useAppStore()

  const [fullName, setFullName] = useState(currentMember?.full_name || (isDemoMode ? 'Priya Sharma' : ''))
  const [phone, setPhone] = useState(currentMember?.phone || (isDemoMode ? '9876543211' : ''))
  const [flatNumber, setFlatNumber] = useState(currentMember?.flat_number || (isDemoMode ? 'B-302' : ''))
  const [saving, setSaving] = useState(false)

  const [notifAnnouncements, setNotifAnnouncements] = useState(true)
  const [notifSecurity, setNotifSecurity] = useState(true)
  const [notifChat, setNotifChat] = useState(false)
  const [notifBazaar, setNotifBazaar] = useState(true)

  const societyName = currentSociety?.name || (isDemoMode ? 'Sunrise Heights' : 'N/A')
  const societyAddress = currentSociety?.address || (isDemoMode ? '42, MG Road, Sector 15, Gurugram' : 'N/A')
  const inviteCode = currentSociety?.invite_code || (isDemoMode ? 'SUNRISE24' : 'N/A')

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error('Full name is required')
      return
    }
    setSaving(true)
    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 500))
        toast.success('Profile updated successfully!')
      } else if (currentMember) {
        const supabase = createClient()
        const { error } = await supabase
          .from('members')
          .update({ full_name: fullName, phone, flat_number: flatNumber })
          .eq('id', currentMember.id)
        if (error) throw error
        toast.success('Profile updated successfully!')
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
    toast.success('Invite code copied!')
  }

  const handleSignOut = async () => {
    try {
      if (!isDemoMode) {
        const supabase = createClient()
        await supabase.auth.signOut()
      }
      useAppStore.getState().reset()
      router.push('/')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile Section */}
      <Card header={
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-teal-600" />
          <span>Profile</span>
        </div>
      }>
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            type="tel"
          />
          <Input
            label="Flat Number"
            value={flatNumber}
            onChange={(e) => setFlatNumber(e.target.value)}
            placeholder="e.g. A-101"
          />
          <div className="pt-2">
            <Button
              icon={<Save className="h-4 w-4" />}
              onClick={handleSaveProfile}
              loading={saving}
            >
              Save Profile
            </Button>
          </div>
        </div>
      </Card>

      {/* Society Info */}
      <Card header={
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-teal-600" />
          <span>Society Information</span>
        </div>
      }>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Society Name</p>
            <p className="text-sm text-gray-900 mt-0.5">{societyName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
            <p className="text-sm text-gray-900 mt-0.5">{societyAddress}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Invite Code</p>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-md text-teal-700 font-semibold">
                {inviteCode}
              </code>
              <button
                onClick={handleCopyInviteCode}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                title="Copy invite code"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card header={
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-teal-600" />
          <span>Notification Preferences</span>
        </div>
      }>
        <div className="space-y-3">
          {[
            { label: 'Announcements', desc: 'New announcements and updates', value: notifAnnouncements, setter: setNotifAnnouncements },
            { label: 'Security', desc: 'Visitor pass verifications and alerts', value: notifSecurity, setter: setNotifSecurity },
            { label: 'Chat', desc: 'New messages in channels', value: notifChat, setter: setNotifChat },
            { label: 'Bazaar', desc: 'New listings and price updates', value: notifBazaar, setter: setNotifBazaar },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-900">{pref.label}</p>
                <p className="text-xs text-gray-500">{pref.desc}</p>
              </div>
              <button
                role="switch"
                aria-checked={pref.value}
                onClick={() => pref.setter(!pref.value)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
                  pref.value ? 'bg-teal-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                    pref.value ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Account Section */}
      <Card header={
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-teal-600" />
          <span>Account</span>
        </div>
      }>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            icon={<Key className="h-4 w-4" />}
            onClick={() => toast('Password change is handled via email reset', { icon: '📧' })}
          >
            Change Password
          </Button>
          <Button
            variant="danger"
            icon={<LogOut className="h-4 w-4" />}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  )
}
