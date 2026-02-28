import { NextRequest, NextResponse } from 'next/server'
import { findMatches } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, listings } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "query" field' },
        { status: 400 }
      )
    }

    if (!Array.isArray(listings)) {
      return NextResponse.json(
        { error: '"listings" must be an array' },
        { status: 400 }
      )
    }

    if (listings.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    try {
      const matches = await findMatches(query.trim(), listings)
      return NextResponse.json({ matches })
    } catch {
      // Fallback: keyword-based matching
      const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 2)

      const scored = listings
        .map(
          (listing: {
            id: string
            title: string
            description: string
            tags: string[]
          }) => {
            const haystack =
              `${listing.title} ${listing.description} ${(listing.tags || []).join(' ')}`.toLowerCase()
            let hits = 0
            for (const word of queryWords) {
              if (haystack.includes(word)) hits++
            }
            const score = queryWords.length > 0 ? Math.round((hits / queryWords.length) * 100) : 0
            return {
              listing_id: listing.id,
              score,
              reason: hits > 0
                ? `Matched ${hits} keyword${hits > 1 ? 's' : ''} from your search`
                : 'No keyword match',
            }
          }
        )
        .filter((m: { score: number }) => m.score > 20)
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
        .slice(0, 5)

      return NextResponse.json({ matches: scored, _fallback: true })
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
