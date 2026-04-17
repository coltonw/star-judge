import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { getBallot, getVoteBySession, upsertVote } from '../db/queries';
import type { Bindings } from '../db/types';

export const votesRouter = new Hono<{ Bindings: Bindings }>();

const voteSchema = z.object({
  ballotId: z.number().int().positive(),
  voterName: z.string().min(1).max(100),
  sessionId: z.string().uuid(),
  ratings: z.record(z.string(), z.enum(['excellent', 'verygood', 'good', 'average', 'fair', 'poor'])),
});

// POST /api/votes — cast or update a vote (upserts on ballot_id + session_id)
votesRouter.post('/', zValidator('json', voteSchema), async (c) => {
  const { ballotId, voterName, sessionId, ratings } = c.req.valid('json');

  const ballot = await getBallot(c.env.DB, ballotId);
  if (!ballot) return c.json({ error: 'Ballot not found' }, 404);
  if (!ballot.active) return c.json({ error: 'Voting is closed' }, 403);

  // Ensure all ballot candidates are rated
  const candidateIds = ballot.candidates.map((c) => c.id);
  const missing = candidateIds.filter((id) => !ratings[id]);
  if (missing.length > 0) {
    return c.json({ error: 'All candidates must be rated', missing }, 400);
  }

  const vote = await upsertVote(c.env.DB, ballotId, voterName, sessionId, ratings);
  return c.json(vote, 200);
});

// GET /api/votes/check?ballotId=1&sessionId=uuid
// Returns hasVoted plus the existing vote data so the form can be pre-filled.
votesRouter.get('/check', async (c) => {
  const ballotId = parseInt(c.req.query('ballotId') ?? '', 10);
  const sessionId = c.req.query('sessionId') ?? '';

  if (Number.isNaN(ballotId) || !sessionId) {
    return c.json({ error: 'Missing ballotId or sessionId' }, 400);
  }

  const vote = await getVoteBySession(c.env.DB, ballotId, sessionId);
  if (!vote) return c.json({ hasVoted: false });

  return c.json({
    hasVoted: true,
    voterName: vote.voter_name,
    ratings: vote.ratings,
  });
});
