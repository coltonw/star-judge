import { env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCollection, parseXmlCollection, resolveCandidateThumbnails } from './bgg-collection';

async function clearR2(): Promise<void> {
  let cursor: string | undefined;
  do {
    const page: R2Objects = await env.BGG_IMAGES.list({ cursor });
    for (const obj of page.objects) {
      await env.BGG_IMAGES.delete(obj.key);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

function xmlResponse(xml: string, status = 200): Response {
  return new Response(xml, { status, headers: { 'content-type': 'application/xml' } });
}

function imageResponse(): Response {
  return new Response(new Uint8Array([0xff, 0xd8, 0xff]), { status: 200, headers: { 'content-type': 'image/jpeg' } });
}

const SAMPLE_XML = `
  <items>
    <item objectid="1">
      <name sortindex="1">Catan</name>
      <thumbnail>https://example.com/catan.jpg</thumbnail>
    </item>
    <item objectid="2">
      <name sortindex="1">Wingspan</name>
      <thumbnail>https://example.com/wingspan.jpg</thumbnail>
    </item>
    <item objectid="3">
      <name sortindex="1">Untouchable</name>
    </item>
  </items>
`;

describe('parseXmlCollection', () => {
  it('decodes HTML entities in names and thumbnails', () => {
    const xml = `
      <items>
        <item objectid="1">
          <name sortindex="1">Wits &amp; Wagers: It&#039;s Vegas, Baby!</name>
          <thumbnail>https://example.com/x.jpg?a=1&amp;b=2</thumbnail>
        </item>
      </items>
    `;
    const [c] = parseXmlCollection(xml);
    expect(c.name).toBe("Wits & Wagers: It's Vegas, Baby!");
    expect(c.bggThumbnailUrl).toBe('https://example.com/x.jpg?a=1&b=2');
  });
});

describe('getCollection', () => {
  beforeEach(async () => {
    await clearR2();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns candidates with R2 URLs for cached images and empty thumbnails for missing ones', async () => {
    await env.BGG_IMAGES.put('bgg/1.jpg', new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: 'image/jpeg' } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(xmlResponse(SAMPLE_XML));

    const result = await getCollection(env, 'someone');
    if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`);

    const byId = Object.fromEntries(result.candidates.map((c) => [c.id, c]));
    expect(byId['1'].thumbnail).toMatch(/\/bgg\/1\.jpg$/);
    expect(byId['2'].thumbnail).toBe('');
    expect(byId['3'].thumbnail).toBe('');
  });

  it('scheduleBackfill writes missing images to R2', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/xmlapi2/collection')) return xmlResponse(SAMPLE_XML);
      return imageResponse();
    });

    const result = await getCollection(env, 'someone');
    if (result.status !== 'ok') throw new Error('expected ok');

    expect(await env.BGG_IMAGES.head('bgg/1.jpg')).toBeNull();
    await result.scheduleBackfill();
    expect(await env.BGG_IMAGES.head('bgg/1.jpg')).not.toBeNull();
    expect(await env.BGG_IMAGES.head('bgg/2.jpg')).not.toBeNull();
    // Items with no BGG thumbnail aren't backfilled.
    expect(await env.BGG_IMAGES.head('bgg/3.jpg')).toBeNull();
  });

  it('reports retry on BGG 202', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 202 }));
    const result = await getCollection(env, 'someone');
    expect(result.status).toBe('retry');
  });

  it('reports upstream-error on non-ok BGG response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }));
    const result = await getCollection(env, 'someone');
    expect(result).toEqual({ status: 'upstream-error', httpStatus: 500 });
  });

  it('reuses the cached XML within the TTL window', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(xmlResponse(SAMPLE_XML));
    await getCollection(env, 'someone');
    await getCollection(env, 'someone');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('resolveCandidateThumbnails', () => {
  beforeEach(async () => {
    await clearR2();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes manual-entry (non-numeric id) candidates through unchanged', async () => {
    const out = await resolveCandidateThumbnails(env, [{ id: 'manual-pick', name: 'Homebrew', thumbnail: 'whatever' }]);
    expect(out).toEqual([{ id: 'manual-pick', name: 'Homebrew', thumbnail: 'whatever' }]);
  });

  it('uses the R2 URL when the image is already cached without hitting BGG', async () => {
    await env.BGG_IMAGES.put('bgg/42.jpg', new Uint8Array([1]));
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const out = await resolveCandidateThumbnails(env, [{ id: '42', name: 'Some Game', thumbnail: '' }]);
    expect(out[0].thumbnail).toMatch(/\/bgg\/42\.jpg$/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches and caches the image when missing, then returns the R2 URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/xmlapi2/collection')) return xmlResponse(SAMPLE_XML);
      return imageResponse();
    });
    const out = await resolveCandidateThumbnails(env, [{ id: '1', name: 'Catan', thumbnail: '' }]);
    expect(out[0].thumbnail).toMatch(/\/bgg\/1\.jpg$/);
    expect(await env.BGG_IMAGES.head('bgg/1.jpg')).not.toBeNull();
  });

  it('returns an empty thumbnail when the BGG lookup has no entry for the id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(xmlResponse(SAMPLE_XML));
    const out = await resolveCandidateThumbnails(env, [{ id: '9999', name: 'Unknown', thumbnail: '' }]);
    expect(out[0].thumbnail).toBe('');
  });
});
