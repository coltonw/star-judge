import { Hono } from 'hono'
import type { Bindings, Candidate } from '../db/types'

export const bggRouter = new Hono<{ Bindings: Bindings }>()

// BGG XML API v2 collection endpoint
const BGG_API = 'https://boardgamegeek.com/xmlapi2'

function parseXmlCollection(xml: string): Candidate[] {
  const candidates: Candidate[] = []
  // Simple regex-based XML parsing — avoids DOM dependency in Workers
  const itemRegex = /<item objectid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const id = match[1]
    const body = match[2]

    const nameMatch = body.match(/<name[^>]*sortindex="1"[^>]*>([^<]+)<\/name>/)
    const thumbnailMatch = body.match(/<thumbnail>([^<]+)<\/thumbnail>/)

    if (nameMatch) {
      candidates.push({
        id,
        name: nameMatch[1].trim(),
        thumbnail: thumbnailMatch ? thumbnailMatch[1].trim() : '',
      })
    }
  }

  return candidates.sort((a, b) => a.name.localeCompare(b.name))
}

// GET /api/bgg/collection?username=dagreenmachine
// Proxies the BGG collection request server-side so credentials stay hidden.
bggRouter.get('/collection', async (c) => {
  const username = c.req.query('username') ?? 'dagreenmachine'

  const params = new URLSearchParams({
    username,
    own: '1',
    excludesubtype: 'boardgameexpansion',
    stats: '0',
  })

  const headers: Record<string, string> = {
    'Accept': 'application/xml',
  }

  // BGG API v2 credentials if provided
  if (c.env.BGG_API_KEY) {
    headers['Authorization'] = `Bearer ${c.env.BGG_API_KEY}`
  }

  const url = `${BGG_API}/collection?${params}`
  const response = await fetch(url, { headers })

  if (response.status === 202) {
    // BGG returns 202 when the collection is still being queued — tell client to retry
    return c.json({ retry: true, message: 'BGG is preparing your collection, please retry in a few seconds' }, 202)
  }

  if (!response.ok) {
    return c.json({ error: `BGG API error: ${response.status}` }, 502)
  }

  const xml = await response.text()
  const candidates = parseXmlCollection(xml)

  return c.json({ candidates })
})
