import { Hono } from 'hono';
import { getBallot, getVotesForBallot } from '../db/queries';
import type { Bindings } from '../db/types';
import { rankBorda } from '../voting/borda';
import { rankCondorcet } from '../voting/condorcet';
import { rankDictator } from '../voting/dictator';
import { rankImplicitVetoMj, rankImplicitVetoStar } from '../voting/implicit-veto';
import { rankIrv } from '../voting/irv';
import { rankMajorityJudgment } from '../voting/majority-judgment';
import { rankStar } from '../voting/star';

export const tallyRouter = new Hono<{ Bindings: Bindings }>();

// GET /api/tally/:id — ranked results for all eight methods
tallyRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  const ballot = await getBallot(c.env.DB, id);
  if (!ballot) return c.json({ error: 'Ballot not found' }, 404);

  const votes = await getVotesForBallot(c.env.DB, id);

  const star = rankStar(ballot.candidates, votes);
  const ivstar = rankImplicitVetoStar(ballot.candidates, votes);
  const mj = rankMajorityJudgment(ballot.candidates, votes);
  const ivmj = rankImplicitVetoMj(ballot.candidates, votes);
  const borda = rankBorda(ballot.candidates, votes);
  const irv = rankIrv(ballot.candidates, votes);
  const { ranked: condorcet, hasParadox: condorcetParadox } = rankCondorcet(ballot.candidates, votes);
  const { ranked: dictator, dictatorName } = rankDictator(ballot.candidates, votes);

  return c.json({
    ballotId: ballot.id,
    ballotName: ballot.name,
    officialMethod: ballot.officialMethod,
    voteCount: votes.length,
    star,
    ivstar,
    mj,
    ivmj,
    borda,
    irv,
    condorcet,
    condorcetParadox,
    dictator,
    dictatorName,
  });
});
