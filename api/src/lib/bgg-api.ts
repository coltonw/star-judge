import type { Bindings } from '../env';

const BGG_API = 'https://boardgamegeek.com/xmlapi2';

export interface RawBggCandidate {
  id: string;
  name: string;
  bggThumbnailUrl: string;
}

export function parseXmlCollection(xml: string): RawBggCandidate[] {
  const candidates: RawBggCandidate[] = [];
  const itemRegex = /<item[^>]* objectid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g;

  for (let match = itemRegex.exec(xml); match !== null; match = itemRegex.exec(xml)) {
    const id = match[1];
    const body = match[2];

    const nameMatch = body.match(/<name[^>]*sortindex="1"[^>]*>([^<]+)<\/name>/);
    const thumbnailMatch = body.match(/<thumbnail>([^<]+)<\/thumbnail>/);

    if (nameMatch) {
      candidates.push({
        id,
        name: nameMatch[1].trim(),
        bggThumbnailUrl: thumbnailMatch ? thumbnailMatch[1].trim() : '',
      });
    }
  }

  return candidates.sort((a, b) => a.name.localeCompare(b.name));
}

// Fetches the BGG collection XML, using the Worker Cache API to avoid hammering
// BGG across requests within the same edge cache window. Pass-through of 202
// and non-ok responses so callers can handle BGG's queued-response behavior.
export async function fetchBggCollectionXml(env: Bindings, username: string): Promise<Response> {
  const params = new URLSearchParams({
    username,
    own: '1',
    excludesubtype: 'boardgameexpansion',
    stats: '0',
  });

  const headers: Record<string, string> = { Accept: 'application/xml' };
  if (env.BGG_API_KEY) headers.Authorization = `Bearer ${env.BGG_API_KEY}`;

  const cacheKey = new Request(`https://bgg-xml-cache.invalid/collection?${params}`, { method: 'GET' });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const fresh = await fetch(`${BGG_API}/collection?${params}`, { headers });
  if (fresh.ok) {
    const toCache = new Response(fresh.clone().body, fresh);
    toCache.headers.set('Cache-Control', 'public, max-age=600');
    await cache.put(cacheKey, toCache);
  }
  return fresh;
}
