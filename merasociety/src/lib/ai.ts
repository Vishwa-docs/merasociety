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
