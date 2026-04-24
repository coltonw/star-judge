import type { Candidate } from '@star-judge/shared';
import { Hono } from 'hono';
import type { Bindings } from '../env';
import { fetchBggCollectionXml, parseXmlCollection } from '../lib/bgg-api';
import { bggImagePublicUrl, cacheBggImage, isBggImageCached } from '../lib/cache-bgg-image';

export const bggRouter = new Hono<{ Bindings: Bindings }>();

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

  const candidates: Candidate[] = await Promise.all(
    raw.map(async (r): Promise<Candidate> => {
      if (!r.bggThumbnailUrl) {
        return { id: r.id, name: r.name, thumbnail: '' };
      }
      if (await isBggImageCached(c.env, r.id)) {
        return { id: r.id, name: r.name, thumbnail: bggImagePublicUrl(c.env, r.id) };
      }
      c.executionCtx.waitUntil(cacheBggImage(c.env, r.id, r.bggThumbnailUrl));
      return { id: r.id, name: r.name, thumbnail: '' };
    })
  );

  // No edge-cache: an empty-thumbnail row becomes an R2 hit once waitUntil
  // finishes; subsequent requests must see the updated state.
  c.header('Cache-Control', 'no-store');

  return c.json({ candidates });
});
