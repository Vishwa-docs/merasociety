'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Building2, Mail, Lock, User, Home, Phone, KeyRound, CheckCircle, Sparkles, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [flatNumber, setFlatNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email || !password || !flatNumber || !inviteCode) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Look up society by invite code
      const { data: society, error: societyError } = await supabase
        .from('societies')
        .select('id')
        .eq('invite_code', inviteCode.toUpperCase())
        .single()

      if (societyError || !society) {
        toast.error('Invalid invite code. Please check with your society admin.')
        setLoading(false)
        return
      }

      // 2. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (authError) {
        toast.error(authError.message)
        setLoading(false)
        return
      }

      // 3. Create member record with pending status
      if (authData.user) {
        const { error: memberError } = await supabase.from('members').insert({
          user_id: authData.user.id,
          society_id: society.id,
          full_name: fullName,
          flat_number: flatNumber,
          phone: phone || null,
          role: 'resident',
          status: 'pending',
          is_verified: false,
        })

        if (memberError) {
          toast.error('Account created but failed to register in society. Contact admin.')
          setLoading(false)
          return
        }
      }

      setSuccess(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-white px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
            <CheckCircle className="mx-auto h-16 w-16 text-teal-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Account Created!</h2>
            <p className="mt-3 text-gray-600">
              Waiting for admin approval. You&apos;ll be notified once your account
              is verified.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
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
          <p className="mt-2 text-gray-600">Create your account to join your society.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Demo Society Banner */}
          <div className="mb-6 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-teal-800">Try the Demo Society</p>
                <p className="mt-1 text-xs text-teal-700">
                  Use invite code <span className="font-mono font-bold bg-teal-100 px-1.5 py-0.5 rounded">SUNRISE2024</span> to
                  join <strong>Sunrise Heights</strong> — a pre-populated demo society with sample data.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              helperText="Minimum 6 characters"
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

            <Input
              label="Society Invite Code"
              type="text"
              placeholder="ABCD1234"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              helperText="Ask your society admin for this code"
              required
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-teal-600 hover:text-teal-700">
              Sign In
            </Link>
          </div>
        </div>

        {/* Register Your Society */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Send className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Want to register your society?</p>
              <p className="mt-1 text-xs text-gray-600">
                Email us at{' '}
                <a
                  href="mailto:vishwakumaresh@gmail.com?subject=New Society Registration"
                  className="font-medium text-teal-600 hover:text-teal-700 underline underline-offset-2"
                >
                  vishwakumaresh@gmail.com
                </a>{' '}
                and we&apos;ll set you up as a society admin with your own invite code.
              </p>
            </div>
          </div>
        </div>      </div>
    </div>
  )
}
