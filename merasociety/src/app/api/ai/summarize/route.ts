import { NextRequest, NextResponse } from 'next/server'
import { summarizeText } from '@/lib/ai'

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
      const summary = await summarizeText(text.trim())
      return NextResponse.json({ summary })
    } catch {
      // Fallback: simple truncation
      const trimmed = text.trim()
      const summary =
        trimmed.length > 150 ? trimmed.slice(0, 150) + '...' : trimmed
      return NextResponse.json({ summary, _fallback: true })
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
