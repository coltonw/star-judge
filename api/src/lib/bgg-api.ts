import type { Bindings } from '../env';

const BGG_API = 'https://boardgamegeek.com/xmlapi2';

export interface RawBggCandidate {
  id: string;
  name: string;
  bggThumbnailUrl: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeXmlEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
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
        name: decodeXmlEntities(nameMatch[1].trim()),
        bggThumbnailUrl: thumbnailMatch ? decodeXmlEntities(thumbnailMatch[1].trim()) : '',
      });
    }
  }

  return candidates.sort((a, b) => a.name.localeCompare(b.name));
}

const COLLECTION_TTL_MS = 6 * 60 * 60 * 1000;
const collectionKey = (username: string) => `bgg-xml/collection-${username}.xml`;

// Caches the BGG collection XML in R2 because `caches.default` is a no-op on
// workers.dev subdomains. Pass-through of 202 and non-ok responses so callers
// can handle BGG's queued-response behavior.
export async function fetchBggCollectionXml(env: Bindings, username: string): Promise<Response> {
  const key = collectionKey(username);
  const cached = await env.BGG_IMAGES.get(key);
  if (cached) {
    const fetchedAt = Number(cached.customMetadata?.fetchedAt ?? 0);
    if (Number.isFinite(fetchedAt) && Date.now() - fetchedAt < COLLECTION_TTL_MS) {
      return new Response(cached.body, {
        status: 200,
        headers: { 'content-type': 'application/xml' },
      });
    }
  }

  const params = new URLSearchParams({
    username,
    own: '1',
    excludesubtype: 'boardgameexpansion',
    stats: '0',
  });

  const headers: Record<string, string> = { Accept: 'application/xml' };
  if (env.BGG_API_KEY) headers.Authorization = `Bearer ${env.BGG_API_KEY}`;

  const fresh = await fetch(`${BGG_API}/collection?${params}`, { headers });
  if (!fresh.ok) return fresh;

  const xml = await fresh.text();
  await env.BGG_IMAGES.put(key, xml, {
    customMetadata: { fetchedAt: String(Date.now()) },
    httpMetadata: { contentType: 'application/xml' },
  });
  return new Response(xml, {
    status: 200,
    headers: { 'content-type': 'application/xml' },
  });
}
