import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getBallot, createVote, getVoteBySession } from '../db/queries'
import { GRADES } from '../db/types'
import type { Bindings } from '../db/types'

export const votesRouter = new Hono<{ Bindings: Bindings }>()

const voteSchema = z.object({
  ballotId: z.number().int().positive(),
  voterName: z.string().min(1).max(100),
  sessionId: z.string().uuid(),
  ratings: z.record(z.string(), z.enum(['excellent', 'verygood', 'good', 'average', 'fair', 'poor'])),
})

// POST /api/votes — cast a vote
votesRouter.post('/', zValidator('json', voteSchema), async (c) => {
  const { ballotId, voterName, sessionId, ratings } = c.req.valid('json')

  const ballot = await getBallot(c.env.DB, ballotId)
  if (!ballot) return c.json({ error: 'Ballot not found' }, 404)
  if (!ballot.active) return c.json({ error: 'Voting is closed' }, 403)

  // Ensure all ballot candidates are rated
  const candidateIds = ballot.candidates.map((c) => c.id)
  const missing = candidateIds.filter((id) => !ratings[id])
  if (missing.length > 0) {
    return c.json({ error: 'All candidates must be rated', missing }, 400)
  }

  // Check for duplicate session vote
  const existing = await getVoteBySession(c.env.DB, ballotId, sessionId)
  if (existing) return c.json({ error: 'Already voted' }, 409)

  const vote = await createVote(c.env.DB, ballotId, voterName, sessionId, ratings)
  return c.json(vote, 201)
})

// GET /api/votes/check?ballotId=1&sessionId=uuid — check if session has voted
votesRouter.get('/check', async (c) => {
  const ballotId = parseInt(c.req.query('ballotId') ?? '', 10)
  const sessionId = c.req.query('sessionId') ?? ''

  if (isNaN(ballotId) || !sessionId) {
    return c.json({ error: 'Missing ballotId or sessionId' }, 400)
  }

  const vote = await getVoteBySession(c.env.DB, ballotId, sessionId)
  return c.json({ hasVoted: vote !== null })
})
