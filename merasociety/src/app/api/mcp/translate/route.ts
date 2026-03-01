import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// MCP-Compatible Translation Endpoint
// Model Context Protocol (MCP) server for AI-powered translation
// Provides a tool interface for translating society announcements
// ============================================================

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || ''
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY || ''

interface MCPToolCall {
  name: string
  arguments: Record<string, unknown>
}

interface MCPToolResult {
  type: 'text'
  text: string
}

// MCP Tool Definitions
const MCP_TOOLS = [
  {
    name: 'translate_to_hindi',
    description: 'Translate English text to Hindi (Devanagari script). Optimized for Indian apartment society announcements and communications.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The English text to translate to Hindi' },
        context: { type: 'string', description: 'Optional context (e.g., "announcement", "notice", "informal chat")', default: 'announcement' },
      },
      required: ['text'],
    },
  },
  {
    name: 'translate_to_english',
    description: 'Translate Hindi text to English. Optimized for Indian apartment society communications.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The Hindi text to translate to English' },
      },
      required: ['text'],
    },
  },
  {
    name: 'detect_language',
    description: 'Detect whether text is primarily Hindi, English, or mixed (Hinglish).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to analyze' },
      },
      required: ['text'],
    },
  },
]

async function callAI(messages: Array<{ role: string; content: string }>, temperature = 0.3): Promise<string> {
  if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
    throw new Error('Azure OpenAI not configured')
  }

  const response = await fetch(AZURE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_API_KEY,
    },
    body: JSON.stringify({ messages, temperature, max_tokens: 1500 }),
  })

  if (!response.ok) throw new Error(`AI error: ${response.status}`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function executeTranslateToHindi(text: string, context: string): Promise<MCPToolResult> {
  const result = await callAI([
    {
      role: 'system',
      content: `You are a translator for an Indian apartment society app. Translate the following English text to natural Hindi (Devanagari script). Context: ${context}. 
Do NOT translate literally — use natural, commonly spoken Hindi. Keep proper nouns, numbers, dates, and times as-is. Return ONLY the translation.`,
    },
    { role: 'user', content: text },
  ])

  return { type: 'text', text: result }
}

async function executeTranslateToEnglish(text: string): Promise<MCPToolResult> {
  const result = await callAI([
    {
      role: 'system',
      content: 'Translate the following Hindi text to clear English. Keep proper nouns, numbers, dates, and times as-is. Return ONLY the translation.',
    },
    { role: 'user', content: text },
  ])

  return { type: 'text', text: result }
}

async function executeDetectLanguage(text: string): Promise<MCPToolResult> {
  // Simple heuristic detection (no AI needed)
  const devanagariRegex = /[\u0900-\u097F]/
  const hasDevanagari = devanagariRegex.test(text)
  const latinChars = text.replace(/[^a-zA-Z]/g, '').length
  const totalChars = text.replace(/\s/g, '').length

  let language: string
  if (hasDevanagari && latinChars > totalChars * 0.3) {
    language = 'hinglish'
  } else if (hasDevanagari) {
    language = 'hindi'
  } else {
    language = 'english'
  }

  return {
    type: 'text',
    text: JSON.stringify({ language, confidence: hasDevanagari ? 0.9 : 0.85 }),
  }
}

// ── GET: MCP Tool Discovery ────────────────────────────────
export async function GET() {
  return NextResponse.json({
    name: 'merasociety-translate-mcp',
    version: '1.0.0',
    description: 'MCP server for translating apartment society communications between English and Hindi',
    tools: MCP_TOOLS,
  })
}

// ── POST: MCP Tool Execution ───────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle MCP-style tool calls
    const toolCall = body as MCPToolCall

    if (!toolCall.name || !toolCall.arguments) {
      // Also handle direct translate requests (non-MCP convenience)
      if (body.text && body.target) {
        const text = body.text as string
        const target = body.target as string

        if (target === 'hindi') {
          const result = await executeTranslateToHindi(text, body.context || 'announcement')
          return NextResponse.json({ translation: result.text })
        } else if (target === 'english') {
          const result = await executeTranslateToEnglish(text)
          return NextResponse.json({ translation: result.text })
        }
      }

      return NextResponse.json(
        { error: 'Invalid request. Provide tool name+arguments or text+target.' },
        { status: 400 }
      )
    }

    let result: MCPToolResult

    switch (toolCall.name) {
      case 'translate_to_hindi':
        result = await executeTranslateToHindi(
          toolCall.arguments.text as string,
          (toolCall.arguments.context as string) || 'announcement'
        )
        break
      case 'translate_to_english':
        result = await executeTranslateToEnglish(toolCall.arguments.text as string)
        break
      case 'detect_language':
        result = await executeDetectLanguage(toolCall.arguments.text as string)
        break
      default:
        return NextResponse.json(
          { error: `Unknown tool: ${toolCall.name}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ result })
  } catch (err) {
    console.error('MCP translate error:', err)
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    )
  }
}
