import { zValidator } from '@hono/zod-validator';
import { createBallotSchema, updateBallotSchema } from '@star-judge/shared';
import { Hono } from 'hono';
import { createBallot, deleteBallot, getActiveBallot, getBallot, getBallots, updateBallot } from '../db/queries';
import type { Bindings } from '../env';
import { normalizeCandidatesForSave } from '../lib/normalize-candidates';

export const ballotsRouter = new Hono<{ Bindings: Bindings }>();

// GET /api/ballots — list all (admin)
ballotsRouter.get('/', async (c) => {
  const ballots = await getBallots(c.env.DB);
  return c.json(ballots);
});

// GET /api/ballots/active — get the current active ballot (public)
ballotsRouter.get('/active', async (c) => {
  const ballot = await getActiveBallot(c.env.DB);
  if (!ballot) return c.json({ error: 'No active ballot' }, 404);
  return c.json(ballot);
});

// GET /api/ballots/:id
ballotsRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const ballot = await getBallot(c.env.DB, id);
  if (!ballot) return c.json({ error: 'Not found' }, 404);
  return c.json(ballot);
});

// POST /api/admin/ballots — create (admin only)
ballotsRouter.post('/', zValidator('json', createBallotSchema), async (c) => {
  const { name, candidates, officialMethod } = c.req.valid('json');
  const normalized = await normalizeCandidatesForSave(c.env, candidates);
  const ballot = await createBallot(c.env.DB, name, normalized, officialMethod);
  return c.json(ballot, 201);
});

// PATCH /api/admin/ballots/:id — update (admin only)
ballotsRouter.patch('/:id', zValidator('json', updateBallotSchema), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const { name, candidates, active, officialMethod } = c.req.valid('json');
  const normalized = await normalizeCandidatesForSave(c.env, candidates);
  const ballot = await updateBallot(c.env.DB, id, name, normalized, active, officialMethod);
  if (!ballot) return c.json({ error: 'Not found' }, 404);
  return c.json(ballot);
});

// DELETE /api/admin/ballots/:id — delete (admin only)
ballotsRouter.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  await deleteBallot(c.env.DB, id);
  return c.json({ ok: true });
});
