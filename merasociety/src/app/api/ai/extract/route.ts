import { NextRequest, NextResponse } from 'next/server'
import { extractListingFromText } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "text" field' },
        { status: 400 }
      )
    }

    try {
      const extracted = await extractListingFromText(text.trim())
      return NextResponse.json(extracted)
    } catch {
      // Fallback extraction when AI is not configured
      const priceMatch = text.match(/₹\s?(\d[\d,]*)|(\d[\d,]*)\s?(?:rs|rupees|inr)/i)
      const price = priceMatch
        ? parseInt((priceMatch[1] || priceMatch[2]).replace(/,/g, ''), 10)
        : null

      let category: 'buy_sell' | 'services' | 'food' = 'buy_sell'
      const lower = text.toLowerCase()
      if (
        lower.includes('cook') ||
        lower.includes('plumber') ||
        lower.includes('electrician') ||
        lower.includes('maid') ||
        lower.includes('service') ||
        lower.includes('tutor') ||
        lower.includes('repair')
      ) {
        category = 'services'
      } else if (
        lower.includes('food') ||
        lower.includes('tiffin') ||
        lower.includes('thali') ||
        lower.includes('cake') ||
        lower.includes('biryani') ||
        lower.includes('homemade') ||
        lower.includes('lunch') ||
        lower.includes('dinner')
      ) {
        category = 'food'
      }

      // Extract first sentence-ish as title
      const firstLine = text.split(/[.\n!?]/)[0]?.trim() || text.trim()
      const title =
        firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine

      return NextResponse.json({
        title,
        description: text.trim(),
        category,
        price,
        tags: [],
        _fallback: true,
      })
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
