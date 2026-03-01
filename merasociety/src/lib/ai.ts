// ============================================================
// Azure OpenAI Integration for MeraSociety
// ============================================================

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || ''
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY || ''

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callAzureOpenAI(messages: ChatMessage[], temperature = 0.3): Promise<string> {
  if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
    throw new Error('Azure OpenAI not configured')
  }

  const response = await fetch(AZURE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_API_KEY,
    },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Azure OpenAI error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Extract structured listing data from WhatsApp-style text
 */
export async function extractListingFromText(rawText: string): Promise<{
  title: string
  description: string
  category: string
  price: number | null
  tags: string[]
  condition?: string
}> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a data extraction assistant for an apartment society marketplace app called MeraSociety.
Extract structured listing data from informal WhatsApp-style messages.
Return ONLY a valid JSON object with these fields:
- title: short clear title (max 60 chars)
- description: cleaned up description
- category: one of "buy_sell", "services", "food"
- price: number or null if not mentioned
- tags: array of relevant tags (max 5)
- condition: "new", "like_new", "good", "fair" or null (only for buy_sell)

Examples:
Input: "Selling my 2 year old washing machine, Samsung 7kg, works perfectly. 8000 rs only. DM me"
Output: {"title":"Samsung 7kg Washing Machine","description":"2 year old Samsung 7kg washing machine in perfect working condition. Contact seller for details.","category":"buy_sell","price":8000,"tags":["electronics","washing-machine","samsung","appliance"],"condition":"good"}

Input: "Anyone knows a good cook? Need someone for lunch and dinner, veg only, for family of 4"
Output: {"title":"Looking for Vegetarian Cook","description":"Need a cook for lunch and dinner, vegetarian only, for a family of 4.","category":"services","price":null,"tags":["cook","vegetarian","daily","household"],"condition":null}`
    },
    {
      role: 'user',
      content: rawText
    }
  ]

  const result = await callAzureOpenAI(messages, 0.2)
  
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    return JSON.parse(jsonMatch[0])
  } catch {
    // Fallback: return basic structure
    return {
      title: rawText.slice(0, 60),
      description: rawText,
      category: 'buy_sell',
      price: null,
      tags: [],
    }
  }
}

/**
 * Find matching listings for a buyer request
 */
export async function findMatches(
  query: string,
  listings: Array<{ id: string; title: string; description: string; category: string; tags: string[] }>
): Promise<Array<{ listing_id: string; score: number; reason: string }>> {
  if (listings.length === 0) return []

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a matching assistant for MeraSociety apartment marketplace.
Given a buyer's request and available listings, score how well each listing matches.
Return a JSON array of objects with: listing_id, score (0-100), reason (one sentence).
Only include listings with score > 30. Sort by score descending. Max 5 results.
Return ONLY valid JSON array.`
    },
    {
      role: 'user',
      content: `Buyer request: "${query}"

Available listings:
${listings.map(l => `- ID: ${l.id}, Title: "${l.title}", Description: "${l.description}", Category: ${l.category}, Tags: ${l.tags.join(', ')}`).join('\n')}`
    }
  ]

  const result = await callAzureOpenAI(messages, 0.3)

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    return JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
}

/**
 * Summarize a long announcement or post
 */
export async function summarizeText(text: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'Summarize the following apartment society announcement in 1-2 clear sentences. Be concise and factual.'
    },
    {
      role: 'user',
      content: text
    }
  ]

  try {
    return await callAzureOpenAI(messages, 0.3)
  } catch {
    return text.slice(0, 150) + (text.length > 150 ? '...' : '')
  }
}

// ============================================================
// AI AGENT: Court Booking Intent Parser
// ============================================================

export interface BookingIntent {
  sport: string | null
  date: string | null // "today", "tomorrow", "monday", etc.
  time_preference: string | null // "morning", "evening", "6 PM", etc.
  duration_hours: number | null
}

/**
 * Parse natural language into a structured court booking intent.
 * Used by the AI Court Booking Agent.
 */
export async function parseBookingIntent(text: string): Promise<BookingIntent> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a booking assistant for MeraSociety apartment society app.
Parse the user's natural language message into a structured booking intent.
Return ONLY a valid JSON object with these fields:
- sport: one of "Badminton", "Tennis", "Basketball", "Table Tennis", or null if not specified
- date: relative date like "today", "tomorrow", "monday", "tuesday", etc. or null
- time_preference: time like "morning", "evening", "6 PM", "after 5", "18:00" or null
- duration_hours: number of hours requested (default 1) or null

Examples:
Input: "Book me a badminton court tomorrow evening"
Output: {"sport":"Badminton","date":"tomorrow","time_preference":"evening","duration_hours":1}

Input: "Any tennis slot available this Saturday morning?"
Output: {"sport":"Tennis","date":"saturday","time_preference":"morning","duration_hours":1}

Input: "I want to play TT for 30 mins today at 4"
Output: {"sport":"Table Tennis","date":"today","time_preference":"4 PM","duration_hours":0.5}

Input: "Book court after 6 PM"
Output: {"sport":null,"date":"today","time_preference":"after 6 PM","duration_hours":1}`
    },
    {
      role: 'user',
      content: text
    }
  ]

  const result = await callAzureOpenAI(messages, 0.1)

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return JSON.parse(jsonMatch[0])
  } catch {
    return { sport: null, date: 'today', time_preference: null, duration_hours: 1 }
  }
}

// ============================================================
// AI AGENT: Detect Listing-like Messages in Chat
// ============================================================

/**
 * Detect if a chat message looks like someone trying to sell/offer/request something.
 * Returns confidence and extracted data if it's a listing.
 */
export async function detectListingInChat(message: string): Promise<{
  is_listing: boolean
  confidence: number
  data?: {
    title: string
    description: string
    category: string
    price: number | null
    tags: string[]
  }
}> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an assistant for MeraSociety apartment marketplace.
Analyze if a chat message is someone trying to sell, buy, offer a service, or offer food.
Return a JSON object with:
- is_listing: boolean - true if this is someone offering/selling/requesting something marketable
- confidence: number 0-100 - how confident you are
- data: object with title, description, category ("buy_sell"|"services"|"food"), price (number or null), tags (array) — only if is_listing is true

Messages that are just casual chat, greetings, questions about weather, etc. should return is_listing: false.

Examples:
"Anyone want a Samsung washing machine? 7kg, 2 years old, 8000 rs" → is_listing: true, confidence: 95
"Good morning everyone!" → is_listing: false, confidence: 5
"Selling homemade laddoos for Diwali, 200 rs per box, DM me" → is_listing: true, confidence: 90
"Has anyone seen my cat?" → is_listing: false, confidence: 5
"I can do yoga classes every morning, free for society members" → is_listing: true, confidence: 85

Return ONLY valid JSON.`
    },
    {
      role: 'user',
      content: message
    }
  ]

  const result = await callAzureOpenAI(messages, 0.2)

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { is_listing: false, confidence: 0 }
    return JSON.parse(jsonMatch[0])
  } catch {
    return { is_listing: false, confidence: 0 }
  }
}

// ============================================================
// AI AGENT: Announcement Composer + Translation
// ============================================================

export interface ComposedAnnouncement {
  title: string
  content: string
  hindi_title: string
  hindi_content: string
  suggested_priority: 'low' | 'normal' | 'high' | 'urgent'
  suggested_pin: boolean
}

/**
 * Take rough admin notes and produce a polished, bilingual announcement.
 * AI Agent that composes professional announcements from informal text.
 */
export async function composeAnnouncement(roughText: string): Promise<ComposedAnnouncement> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an announcement composer for MeraSociety, an Indian apartment society management app.
Take rough admin notes and produce a professional bilingual announcement.

Return ONLY a valid JSON object with:
- title: Clear, concise English title (max 80 chars)
- content: Professional, well-formatted English announcement (2-4 paragraphs, include relevant details, timings, consequences)
- hindi_title: Hindi translation of the title (Devanagari script)
- hindi_content: Hindi translation of the content (Devanagari script, natural Hindi, not word-by-word translation)
- suggested_priority: one of "low", "normal", "high", "urgent" based on impact/urgency
- suggested_pin: boolean — true if this should be pinned (safety issues, deadlines, major events)

Examples:
Input: "water tank cleaning tmrw 10am-2pm no water"
Output: {"title":"Water Tank Cleaning — Tomorrow","content":"Dear Residents,\\n\\nThe overhead water tanks will be cleaned tomorrow between 10:00 AM and 2:00 PM. Water supply will be unavailable during this period.\\n\\nPlease store sufficient water for your daily needs beforehand. We apologize for the inconvenience.\\n\\nThank you for your cooperation.","hindi_title":"पानी की टंकी की सफाई — कल","hindi_content":"प्रिय निवासियों,\\n\\nकल सुबह 10:00 बजे से दोपहर 2:00 बजे तक ऊपरी पानी की टंकियों की सफाई की जाएगी। इस दौरान पानी की आपूर्ति उपलब्ध नहीं होगी।\\n\\nकृपया पहले से अपनी दैनिक ज़रूरतों के लिए पर्याप्त पानी जमा कर लें। असुविधा के लिए क्षमा चाहते हैं।\\n\\nआपके सहयोग के लिए धन्यवाद।","suggested_priority":"high","suggested_pin":true}

Input: "new gym equipment installed come check it out"
Output: {"title":"New Gym Equipment Installed! 💪","content":"Great news, residents!\\n\\nWe have installed new equipment in the society gym. Come check out the latest additions and enjoy your workouts!\\n\\nPlease remember to follow the gym rules and wipe down equipment after use. Gym timings remain unchanged.","hindi_title":"जिम में नए उपकरण लगाए गए! 💪","hindi_content":"प्रिय निवासियों,\\n\\nसोसाइटी जिम में नए उपकरण लगाए गए हैं। आइए और नए उपकरणों का आनंद लें!\\n\\nकृपया जिम के नियमों का पालन करें और उपयोग के बाद उपकरणों को साफ करें। जिम का समय पहले जैसा ही रहेगा।","suggested_priority":"normal","suggested_pin":false}`
    },
    {
      role: 'user',
      content: roughText
    }
  ]

  const result = await callAzureOpenAI(messages, 0.3)

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return JSON.parse(jsonMatch[0])
  } catch {
    return {
      title: roughText.slice(0, 80),
      content: roughText,
      hindi_title: '',
      hindi_content: '',
      suggested_priority: 'normal',
      suggested_pin: false,
    }
  }
}
