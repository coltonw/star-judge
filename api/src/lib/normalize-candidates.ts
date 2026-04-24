import type { Candidate } from '@star-judge/shared';
import type { Bindings } from '../env';
import { fetchBggCollectionXml, parseXmlCollection } from './bgg-api';
import { bggImagePublicUrl, cacheBggImage, isBggImageCached } from './cache-bgg-image';

const BGG_ID_RE = /^\d+$/;
const DEFAULT_BGG_USERNAME = 'dagreenmachine';

// Before persisting a ballot, rewrite every BGG-sourced candidate's thumbnail
// to point at R2. Ensures no saved ballot ever references geekdo-images.com
// directly. Manual-entry candidates (non-numeric ids) are left untouched.
export async function normalizeCandidatesForSave(env: Bindings, candidates: Candidate[]): Promise<Candidate[]> {
  let bggLookupPromise: Promise<Map<string, string>> | null = null;
  const getBggLookup = (): Promise<Map<string, string>> => {
    if (!bggLookupPromise) {
      bggLookupPromise = (async () => {
        const resp = await fetchBggCollectionXml(env, DEFAULT_BGG_USERNAME);
        if (!resp.ok) return new Map();
        const xml = await resp.text();
        return new Map(parseXmlCollection(xml).map((r) => [r.id, r.bggThumbnailUrl]));
      })();
    }
    return bggLookupPromise;
  };

  return Promise.all(
    candidates.map(async (cand): Promise<Candidate> => {
      if (!BGG_ID_RE.test(cand.id)) return cand;

      if (await isBggImageCached(env, cand.id)) {
        return { ...cand, thumbnail: bggImagePublicUrl(env, cand.id) };
      }

      const lookup = await getBggLookup();
      const sourceUrl = lookup.get(cand.id);
      if (!sourceUrl) return { ...cand, thumbnail: '' };

      const r2Url = await cacheBggImage(env, cand.id, sourceUrl);
      return { ...cand, thumbnail: r2Url ?? '' };
    })
  );
}
