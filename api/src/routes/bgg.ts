import { Hono } from 'hono';
import type { Bindings } from '../env';
import { getCollection } from '../lib/bgg-collection';

export const bggRouter = new Hono<{ Bindings: Bindings }>();

// GET /api/bgg/collection?username=dagreenmachine
// Resolves thumbnails to R2-hosted URLs. Misses are filled asynchronously via
// waitUntil; subsequent requests see them as R2 hits. Clients never receive a
// BGG-hosted thumbnail URL.
bggRouter.get('/collection', async (c) => {
  const username = c.req.query('username') ?? 'dagreenmachine';
  const result = await getCollection(c.env, username);

  if (result.status === 'retry') {
    return c.json({ retry: true, message: 'BGG is preparing your collection, please retry in a few seconds' }, 202);
  }
  if (result.status === 'upstream-error') {
    return c.json({ error: `BGG API error: ${result.httpStatus}` }, 502);
  }

  c.executionCtx.waitUntil(result.scheduleBackfill());

  // No edge-cache: an empty-thumbnail row becomes an R2 hit once waitUntil
  // finishes; subsequent requests must see the updated state.
  c.header('Cache-Control', 'no-store');
  return c.json({ candidates: result.candidates });
});
