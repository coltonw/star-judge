import { Hono } from 'hono'
import { getBallot, getVotesForBallot } from '../db/queries'
import { rankMajorityJudgment } from '../voting/majority-judgment'
import { rankStar } from '../voting/star'
import type { Bindings } from '../db/types'

export const tallyRouter = new Hono<{ Bindings: Bindings }>()

// GET /api/tally/:id — get ranked results for both methods
tallyRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)

  const ballot = await getBallot(c.env.DB, id)
  if (!ballot) return c.json({ error: 'Ballot not found' }, 404)

  const votes = await getVotesForBallot(c.env.DB, id)

  const mj = rankMajorityJudgment(ballot.candidates, votes)
  const star = rankStar(ballot.candidates, votes)

  return c.json({
    ballotId: ballot.id,
    ballotName: ballot.name,
    voteCount: votes.length,
    mj,
    star,
  })
})
