import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../index';
import { resetDb } from '../test-setup';

// Integration tests hit the real Hono app against a fresh in-memory D1 per test.
// Covers the golden path: create ballot → cast votes → fetch tally.

function request(path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://test${path}`, init), env);
}

function asJson(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  };
}

describe('api routes', () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe('POST /api/admin/ballots', () => {
    it('creates a ballot with candidates', async () => {
      const res = await request(
        '/api/admin/ballots',
        asJson({
          method: 'POST',
          body: JSON.stringify({
            name: 'Game Night',
            candidates: [
              { id: '1', name: 'Catan', thumbnail: '' },
              { id: '2', name: 'Wingspan', thumbnail: '' },
            ],
            officialMethod: 'mj',
          }),
        })
      );

      expect(res.status).toBe(201);
      const ballot = (await res.json()) as { id: number; name: string; candidates: { id: string }[] };
      expect(ballot.name).toBe('Game Night');
      expect(ballot.candidates).toHaveLength(2);
      expect(ballot.id).toEqual(expect.any(Number));
    });

    it('rejects a ballot with fewer than 2 candidates', async () => {
      const res = await request(
        '/api/admin/ballots',
        asJson({
          method: 'POST',
          body: JSON.stringify({
            name: 'Too Small',
            candidates: [{ id: '1', name: 'Catan', thumbnail: '' }],
            officialMethod: 'mj',
          }),
        })
      );
      expect(res.status).toBe(400);
    });

    it('attaches X-Request-ID header', async () => {
      const res = await request('/');
      expect(res.headers.get('X-Request-ID')).toMatch(/.+/);
    });

    it('echoes incoming X-Request-ID', async () => {
      const res = await request('/', { headers: { 'X-Request-ID': 'abc-123' } });
      expect(res.headers.get('X-Request-ID')).toBe('abc-123');
    });
  });

  describe('golden path: ballot → votes → tally', () => {
    let ballotId: number;

    beforeEach(async () => {
      const createRes = await request(
        '/api/admin/ballots',
        asJson({
          method: 'POST',
          body: JSON.stringify({
            name: 'Weekend Picks',
            candidates: [
              { id: 'A', name: 'Catan', thumbnail: '' },
              { id: 'B', name: 'Wingspan', thumbnail: '' },
              { id: 'C', name: 'Terraforming Mars', thumbnail: '' },
            ],
            officialMethod: 'ivstar',
          }),
        })
      );
      const ballot = (await createRes.json()) as { id: number };
      ballotId = ballot.id;
    });

    it('casts votes and returns a tally with all 8 methods', async () => {
      const cast = (sessionId: string, voterName: string, ratings: Record<string, string>) =>
        request(
          '/api/votes',
          asJson({
            method: 'POST',
            body: JSON.stringify({ ballotId, voterName, sessionId, ratings }),
          })
        );

      await cast(crypto.randomUUID(), 'Alice', { A: 'excellent', B: 'good', C: 'fair' });
      await cast(crypto.randomUUID(), 'Bob', { A: 'good', B: 'excellent', C: 'poor' });
      await cast(crypto.randomUUID(), 'Carol', { A: 'excellent', B: 'verygood', C: 'fair' });

      const tallyRes = await request(`/api/tally/${ballotId}`);
      expect(tallyRes.status).toBe(200);
      expect(tallyRes.headers.get('Cache-Control')).toMatch(/max-age=10/);

      const tally = (await tallyRes.json()) as {
        voteCount: number;
        star: { rank: number }[];
        mj: unknown[];
        borda: unknown[];
        irv: unknown[];
        condorcet: unknown[];
        ivstar: unknown[];
        ivmj: unknown[];
        dictator: unknown[];
      };

      expect(tally.voteCount).toBe(3);
      for (const method of ['star', 'mj', 'borda', 'irv', 'condorcet', 'ivstar', 'ivmj', 'dictator'] as const) {
        expect(tally[method]).toHaveLength(3);
      }
    });

    it('upserts a vote for the same session id', async () => {
      const sessionId = crypto.randomUUID();
      const cast = (ratings: Record<string, string>) =>
        request(
          '/api/votes',
          asJson({
            method: 'POST',
            body: JSON.stringify({ ballotId, voterName: 'Dave', sessionId, ratings }),
          })
        );

      await cast({ A: 'poor', B: 'poor', C: 'poor' });
      await cast({ A: 'excellent', B: 'excellent', C: 'excellent' });

      const check = await request(`/api/votes/check?ballotId=${ballotId}&sessionId=${sessionId}`);
      const body = (await check.json()) as { hasVoted: boolean; ratings: Record<string, string> };
      expect(body.hasVoted).toBe(true);
      expect(body.ratings.A).toBe('excellent');
    });

    it('rejects votes missing a candidate rating', async () => {
      const res = await request(
        '/api/votes',
        asJson({
          method: 'POST',
          body: JSON.stringify({
            ballotId,
            voterName: 'Eve',
            sessionId: crypto.randomUUID(),
            ratings: { A: 'good', B: 'good' }, // missing C
          }),
        })
      );
      expect(res.status).toBe(400);
    });

    it('rejects votes on an inactive ballot', async () => {
      await request(
        `/api/admin/ballots/${ballotId}`,
        asJson({
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Weekend Picks',
            candidates: [
              { id: 'A', name: 'Catan', thumbnail: '' },
              { id: 'B', name: 'Wingspan', thumbnail: '' },
              { id: 'C', name: 'Terraforming Mars', thumbnail: '' },
            ],
            active: false,
            officialMethod: 'ivstar',
          }),
        })
      );

      const res = await request(
        '/api/votes',
        asJson({
          method: 'POST',
          body: JSON.stringify({
            ballotId,
            voterName: 'Frank',
            sessionId: crypto.randomUUID(),
            ratings: { A: 'good', B: 'good', C: 'good' },
          }),
        })
      );
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tally/:id', () => {
    it('returns 404 for an unknown ballot', async () => {
      const res = await request('/api/tally/99999');
      expect(res.status).toBe(404);
    });
  });
});
