import type { Candidate } from '@star-judge/shared';
import { Hono } from 'hono';
import type { Bindings } from '../env';
import { fetchBggCollectionXml, parseXmlCollection } from '../lib/bgg-api';
import { bggImagePublicUrl, cacheBggImage } from '../lib/cache-bgg-image';

export const bggRouter = new Hono<{ Bindings: Bindings }>();

// Free-tier Workers allow 50 subrequests per invocation. Each backfill entry
// costs a BGG fetch + an R2 put (2 subrequests), so 6 concurrent streams stay
// well under the budget while keeping BGG happy.
const BACKFILL_CONCURRENCY = 6;
const BGG_KEY_RE = /^bgg\/(\d+)\.jpg$/;

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

async function backfillImages(env: Bindings, missing: Array<{ id: string; url: string }>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(BACKFILL_CONCURRENCY, missing.length) }, async () => {
    while (next < missing.length) {
      const { id, url } = missing[next++];
      try {
        await cacheBggImage(env, id, url, { skipCheck: true });
      } catch {
        // best-effort; next refresh will retry
      }
    }
  });
  await Promise.all(workers);
}

// GET /api/bgg/collection?username=dagreenmachine
// Resolves thumbnails to R2-hosted URLs. Misses are filled asynchronously via
// waitUntil; subsequent requests see them as R2 hits. Clients never receive a
// BGG-hosted thumbnail URL.
bggRouter.get('/collection', async (c) => {
  const username = c.req.query('username') ?? 'dagreenmachine';

  const response = await fetchBggCollectionXml(c.env, username);

  if (response.status === 202) {
    return c.json({ retry: true, message: 'BGG is preparing your collection, please retry in a few seconds' }, 202);
  }
  if (!response.ok) {
    return c.json({ error: `BGG API error: ${response.status}` }, 502);
  }

  const xml = await response.text();
  const raw = parseXmlCollection(xml);

  const cachedIds = await listCachedBggIds(c.env);
  const missing: Array<{ id: string; url: string }> = [];

  const candidates: Candidate[] = raw.map((r): Candidate => {
    if (!r.bggThumbnailUrl) return { id: r.id, name: r.name, thumbnail: '' };
    if (cachedIds.has(r.id)) {
      return { id: r.id, name: r.name, thumbnail: bggImagePublicUrl(c.env, r.id) };
    }
    missing.push({ id: r.id, url: r.bggThumbnailUrl });
    return { id: r.id, name: r.name, thumbnail: '' };
  });

  if (missing.length > 0) {
    c.executionCtx.waitUntil(backfillImages(c.env, missing));
  }

  // No edge-cache: an empty-thumbnail row becomes an R2 hit once waitUntil
  // finishes; subsequent requests must see the updated state.
  c.header('Cache-Control', 'no-store');

  return c.json({ candidates });
});
