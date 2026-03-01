import { NextRequest, NextResponse } from 'next/server'
import { detectListingInChat, extractListingFromText } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, action } = body

    // Action 1: Detect if a message is a listing
    if (action === 'detect') {
      if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Missing message' }, { status: 400 })
      }

      try {
        const result = await detectListingInChat(message)
        return NextResponse.json(result)
      } catch {
        // Fallback: keyword-based detection
        const lower = message.toLowerCase()
        const sellKeywords = ['selling', 'sell', 'for sale', 'want to sell', 'rs', '₹', 'price', 'dm me', 'contact me']
        const serviceKeywords = ['available for', 'offering', 'classes', 'coaching', 'tutor', 'cook available', 'maid available']
        const foodKeywords = ['homemade', 'tiffin', 'biryani', 'order now', 'per plate', 'home food']

        const hasSell = sellKeywords.some(k => lower.includes(k))
        const hasService = serviceKeywords.some(k => lower.includes(k))
        const hasFood = foodKeywords.some(k => lower.includes(k))

        if (hasSell || hasService || hasFood) {
          const category = hasFood ? 'food' : hasService ? 'services' : 'buy_sell'
          const priceMatch = message.match(/₹\s?(\d[\d,]*)|(\d[\d,]*)\s?(?:rs|rupees)/i)
          const price = priceMatch
            ? parseInt((priceMatch[1] || priceMatch[2]).replace(/,/g, ''), 10)
            : null

          return NextResponse.json({
            is_listing: true,
            confidence: 60,
            data: {
              title: message.slice(0, 60),
              description: message,
              category,
              price,
              tags: [],
            },
            _fallback: true,
          })
        }

        return NextResponse.json({ is_listing: false, confidence: 0, _fallback: true })
      }
    }

    // Action 2: Extract structured listing from message
    if (action === 'extract') {
      if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Missing message' }, { status: 400 })
      }

      try {
        const extracted = await extractListingFromText(message)
        return NextResponse.json({ success: true, listing: extracted })
      } catch {
        // Fallback extraction
        const lower = message.toLowerCase()
        let category: 'buy_sell' | 'services' | 'food' = 'buy_sell'
        if (lower.includes('cook') || lower.includes('maid') || lower.includes('service')) {
          category = 'services'
        } else if (lower.includes('food') || lower.includes('tiffin') || lower.includes('biryani')) {
          category = 'food'
        }

        const priceMatch = message.match(/₹\s?(\d[\d,]*)|(\d[\d,]*)\s?(?:rs|rupees)/i)
        const price = priceMatch
          ? parseInt((priceMatch[1] || priceMatch[2]).replace(/,/g, ''), 10)
          : null

        return NextResponse.json({
          success: true,
          listing: {
            title: message.slice(0, 60),
            description: message,
            category,
            price,
            tags: [],
          },
          _fallback: true,
        })
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use "detect" or "extract".' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
