import { NextRequest, NextResponse } from 'next/server'
import { composeAnnouncement } from '@/lib/ai'

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
      const composed = await composeAnnouncement(text.trim())
      return NextResponse.json({ success: true, ...composed })
    } catch {
      // Fallback: return the text as-is with defaults
      const lines = text.trim().split(/[.\n]/)
      const title = (lines[0] || text.trim()).slice(0, 80)

      return NextResponse.json({
        success: true,
        title,
        content: text.trim(),
        hindi_title: '',
        hindi_content: '',
        suggested_priority: 'normal',
        suggested_pin: false,
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
