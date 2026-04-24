import type { Bindings } from '../env';

const bggImageKey = (bggId: string) => `bgg/${bggId}.jpg`;

export function bggImagePublicUrl(env: Bindings, bggId: string): string {
  const base = env.BGG_IMAGES_PUBLIC_BASE.replace(/\/$/, '');
  return `${base}/${bggImageKey(bggId)}`;
}

export async function isBggImageCached(env: Bindings, bggId: string): Promise<boolean> {
  const head = await env.BGG_IMAGES.head(bggImageKey(bggId));
  return head !== null;
}

// Fetches sourceUrl from BGG and writes it to R2 if missing. Returns the public
// URL on success, or null if the fetch fails. Safe to call redundantly — it
// short-circuits on cache hit.
export async function cacheBggImage(env: Bindings, bggId: string, sourceUrl: string): Promise<string | null> {
  if (!sourceUrl) return null;
  const key = bggImageKey(bggId);

  if (await isBggImageCached(env, bggId)) {
    return bggImagePublicUrl(env, bggId);
  }

  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch {
    return null;
  }
  if (!response.ok || !response.body) return null;

  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  await env.BGG_IMAGES.put(key, response.body, {
    httpMetadata: { contentType },
  });
  return bggImagePublicUrl(env, bggId);
}
