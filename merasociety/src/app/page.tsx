import Link from 'next/link'
import {
  Bell,
  MessageCircle,
  ShoppingBag,
  Shield,
  Trophy,
  Sparkles,
  ArrowRight,
  Building2,
  Users,
  Zap,
  CheckCircle,
} from 'lucide-react'

const features = [
  {
    title: 'Announcements',
    description: 'Pin important notices, track who has seen them, and keep everyone informed in real time.',
    icon: Bell,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    title: 'Community Chat',
    description: 'Topic-based channels for your society. No more lost messages in noisy WhatsApp groups.',
    icon: MessageCircle,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    title: 'Bazaar',
    description: 'Buy, sell, or offer services within your society. AI-powered listing creation from photos.',
    icon: ShoppingBag,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    title: 'Security Passes',
    description: 'Pre-approve guests and deliveries with QR-code based digital passes.',
    icon: Shield,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    title: 'Sports Booking',
    description: 'Reserve courts, gyms, and community halls. Fair slot-based booking system.',
    icon: Trophy,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    title: 'AI-Powered',
    description: 'Smart announcements, auto-generated listings from photos, and intelligent summaries.',
    icon: Sparkles,
    color: 'text-teal-500',
    bg: 'bg-teal-50',
  },
]

const steps = [
  {
    num: '01',
    title: 'Join Your Society',
    description: 'Sign up with your invite code and get verified by your society admin.',
    icon: Building2,
  },
  {
    num: '02',
    title: 'Explore Features',
    description: 'Access announcements, chat, marketplace, security passes, and more.',
    icon: Zap,
  },
  {
    num: '03',
    title: 'Better Community',
    description: 'Stay connected, resolve issues faster, and build a stronger neighborhood.',
    icon: Users,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-teal-600" />
            <span className="text-xl font-bold text-gray-900">MeraSociety</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-cyan-50 to-white" />
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-cyan-200/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center sm:pt-28 sm:pb-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700 mb-8">
            <Sparkles className="h-4 w-4" />
            AI-Powered Society Management
          </div>

          <h1 className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Your Society,{' '}
            <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
              Connected
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Replace WhatsApp chaos with structured workflows — announcements,
            chat, marketplace, security passes, sports booking — all in one
            beautiful app built for Indian apartment societies.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-teal-600/25 hover:bg-teal-700 transition-all"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Everything Your Society Needs
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            One platform to manage your entire apartment community.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`${f.bg} inline-flex rounded-xl p-3 mb-4`}
              >
                <f.icon className={`h-6 w-6 ${f.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get your society up and running in minutes.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/25 mb-6">
                  <s.icon className="h-7 w-7" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-teal-600">
                  Step {s.num}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-cyan-600" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent" />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-teal-200 mb-6" />
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Transform Your Society?
          </h2>
          <p className="mt-4 text-lg text-teal-100">
            Join hundreds of societies already using MeraSociety to manage
            their communities more efficiently.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-base font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              <span className="font-semibold text-gray-900">MeraSociety</span>
            </div>
            <p className="text-sm text-gray-500">
              Built with Next.js, Supabase &amp; AI — for the{' '}
              <a
                href="https://dev.to"
                className="text-teal-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Dev.to
              </a>{' '}
              Weekend Build Hackathon.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
