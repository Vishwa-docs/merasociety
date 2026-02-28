import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="text-7xl mb-4">🏘️</div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-gray-500 max-w-md mb-8">
        Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          Go Home
        </Link>
      </div>
      <p className="mt-12 text-xs text-gray-400">
        MeraSociety &mdash; Your Society, Connected
      </p>
    </div>
  )
}
