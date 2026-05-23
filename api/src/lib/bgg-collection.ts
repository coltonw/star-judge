import type { Candidate } from '@star-judge/shared';
import type { Bindings } from '../env';

const BGG_API = 'https://boardgamegeek.com/xmlapi2';
const COLLECTION_TTL_MS = 6 * 60 * 60 * 1000;
const BGG_KEY_RE = /^bgg\/(\d+)\.jpg$/;
const BGG_ID_RE = /^\d+$/;
// Free-tier Workers allow 50 subrequests per invocation. Each backfill entry
// costs a BGG fetch + an R2 put (2 subrequests), so 6 concurrent streams stay
// well under the budget while keeping BGG happy.
const BACKFILL_CONCURRENCY = 6;

const imageKey = (bggId: string) => `bgg/${bggId}.jpg`;
const collectionXmlKey = (username: string) => `bgg-xml/collection-${username}.xml`;

function publicImageUrl(env: Bindings, bggId: string): string {
  const base = env.BGG_IMAGES_PUBLIC_BASE.replace(/\/$/, '');
  return `${base}/${imageKey(bggId)}`;
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

export interface RawBggCandidate {
  id: string;
  name: string;
  bggThumbnailUrl: string;
}

// Exported for the standalone debug script in routes/_debug-bgg.ts. Pure
// function — safe to use anywhere; the rest of the module treats it as an
// internal helper.
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

// Caches the BGG collection XML in R2 because `caches.default` is a no-op on
// workers.dev subdomains. Returns null on upstream failure (caller decides how
// to map that to a response); returns { status: 'retry' } on BGG's 202 queue.
type XmlFetchResult =
  | { status: 'ok'; xml: string }
  | { status: 'retry' }
  | { status: 'upstream-error'; httpStatus: number };

async function fetchCollectionXml(env: Bindings, username: string): Promise<XmlFetchResult> {
  const key = collectionXmlKey(username);
  const cached = await env.BGG_IMAGES.get(key);
  if (cached) {
    const fetchedAt = Number(cached.customMetadata?.fetchedAt ?? 0);
    if (Number.isFinite(fetchedAt) && Date.now() - fetchedAt < COLLECTION_TTL_MS) {
      return { status: 'ok', xml: await cached.text() };
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
  if (fresh.status === 202) return { status: 'retry' };
  if (!fresh.ok) return { status: 'upstream-error', httpStatus: fresh.status };

  const xml = await fresh.text();
  await env.BGG_IMAGES.put(key, xml, {
    customMetadata: { fetchedAt: String(Date.now()) },
    httpMetadata: { contentType: 'application/xml' },
  });
  return { status: 'ok', xml };
}

async function listCachedBggIds(env: Bindings): Promise<Set<string>> {
  const cached = new Set<string>();
  let cursor: string | undefined;
  do {
    const page: R2Objects = await env.BGG_IMAGES.list({ prefix: 'bgg/', cursor });
    for (const obj of page.objects) {
      const match = BGG_KEY_RE.exec(obj.key);
      if (match) cached.add(match[1]);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return cached;
}

// Fetches a single image from BGG and writes it to R2. Returns true when the
// object exists (or now exists) in R2. Skips the HEAD check when the caller
// has already confirmed the object is missing.
async function cacheImage(
  env: Bindings,
  bggId: string,
  sourceUrl: string,
  options?: { skipCheck?: boolean }
): Promise<boolean> {
  if (!sourceUrl) return false;
  const key = imageKey(bggId);
  if (!options?.skipCheck) {
    const existing = await env.BGG_IMAGES.head(key);
    if (existing !== null) return true;
  }
  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch {
    return false;
  }
  if (!response.ok || !response.body) return false;
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  await env.BGG_IMAGES.put(key, response.body, { httpMetadata: { contentType } });
  return true;
}

export type CollectionResult =
  | { status: 'ok'; candidates: Candidate[]; scheduleBackfill: () => Promise<void> }
  | { status: 'retry' }
  | { status: 'upstream-error'; httpStatus: number };

// Returns the user's BGG-owned games shaped as voting Candidates with
// R2-hosted thumbnails. Missing R2 entries are reported via scheduleBackfill —
// callers hand it to executionCtx.waitUntil so subsequent requests find the
// images cached. The closure is always safe to call (no-ops when nothing is
// missing).
export async function getCollection(env: Bindings, username: string): Promise<CollectionResult> {
  const xmlResult = await fetchCollectionXml(env, username);
  if (xmlResult.status !== 'ok') return xmlResult;

  const raw = parseXmlCollection(xmlResult.xml);
  const cachedIds = await listCachedBggIds(env);
  const missing: Array<{ id: string; url: string }> = [];

  const candidates: Candidate[] = raw.map((r): Candidate => {
    if (!r.bggThumbnailUrl) return { id: r.id, name: r.name, thumbnail: '' };
    if (cachedIds.has(r.id)) {
      return { id: r.id, name: r.name, thumbnail: publicImageUrl(env, r.id) };
    }
    missing.push({ id: r.id, url: r.bggThumbnailUrl });
    return { id: r.id, name: r.name, thumbnail: '' };
  });

  const scheduleBackfill = async (): Promise<void> => {
    if (missing.length === 0) return;
    let next = 0;
    const workers = Array.from({ length: Math.min(BACKFILL_CONCURRENCY, missing.length) }, async () => {
      while (next < missing.length) {
        const { id, url } = missing[next++];
        await cacheImage(env, id, url, { skipCheck: true });
      }
    });
    await Promise.all(workers);
  };

  return { status: 'ok', candidates, scheduleBackfill };
}

const DEFAULT_BGG_USERNAME = 'dagreenmachine';

// Rewrites every BGG-sourced candidate's thumbnail to point at R2 before the
// ballot is persisted. Ensures no saved ballot ever references geekdo-images
// directly. Manual-entry candidates (non-numeric ids) pass through unchanged.
export async function resolveCandidateThumbnails(env: Bindings, candidates: Candidate[]): Promise<Candidate[]> {
  let lookupPromise: Promise<Map<string, string>> | null = null;
  const lookupBggThumbnails = (): Promise<Map<string, string>> => {
    if (!lookupPromise) {
      lookupPromise = (async () => {
        const xmlResult = await fetchCollectionXml(env, DEFAULT_BGG_USERNAME);
        if (xmlResult.status !== 'ok') return new Map();
        return new Map(parseXmlCollection(xmlResult.xml).map((r) => [r.id, r.bggThumbnailUrl]));
      })();
    }
    return lookupPromise;
  };

  return Promise.all(
    candidates.map(async (cand): Promise<Candidate> => {
      if (!BGG_ID_RE.test(cand.id)) return cand;

      const existing = await env.BGG_IMAGES.head(imageKey(cand.id));
      if (existing !== null) {
        return { ...cand, thumbnail: publicImageUrl(env, cand.id) };
      }

      const lookup = await lookupBggThumbnails();
      const sourceUrl = lookup.get(cand.id);
      if (!sourceUrl) return { ...cand, thumbnail: '' };

      const cached = await cacheImage(env, cand.id, sourceUrl, { skipCheck: true });
      return cached ? { ...cand, thumbnail: publicImageUrl(env, cand.id) } : { ...cand, thumbnail: '' };
    })
  );
}
