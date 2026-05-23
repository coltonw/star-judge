import { buildTally } from '@star-judge/voting';
import { Hono } from 'hono';
import { getBallot, getVotesForBallot } from '../db/queries';
import type { Bindings } from '../env';

export const tallyRouter = new Hono<{ Bindings: Bindings }>();

// GET /api/tally/:id — ranked results for all eight methods
tallyRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  const ballot = await getBallot(c.env.DB, id);
  if (!ballot) return c.json({ error: 'Ballot not found' }, 404);

  const votes = await getVotesForBallot(c.env.DB, id);

  // Tally responses are deterministic given (ballot, votes). Ten seconds of edge
  // caching turns polling clients into a no-op at the origin without meaningfully
  // stale data.
  c.header('Cache-Control', 'public, max-age=10, s-maxage=10');

  return c.json(
    buildTally(
      { ballotId: ballot.id, ballotName: ballot.name, officialMethod: ballot.officialMethod },
      ballot.candidates,
      votes
    )
  );
});
