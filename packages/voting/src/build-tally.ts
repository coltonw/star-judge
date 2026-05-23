import type { Candidate, TallyResponse, Vote, VotingMethodKey } from '@star-judge/shared';
import { rankBorda } from './borda';
import { rankCondorcet } from './condorcet';
import { rankDictator } from './dictator';
import { rankImplicitVetoMj, rankImplicitVetoStar } from './implicit-veto';
import { rankIrv } from './irv';
import { rankMajorityJudgment } from './majority-judgment';
import { rankStar } from './star';

export interface TallyMeta {
  ballotId: number;
  ballotName: string;
  officialMethod: VotingMethodKey;
}

// Runs every method against the given candidates + votes and assembles the
// TallyResponse the api and the mock-scenario fixtures both consume.
export function buildTally(meta: TallyMeta, candidates: Candidate[], votes: Vote[]): TallyResponse {
  const { ranked: condorcet, hasParadox: condorcetParadox } = rankCondorcet(candidates, votes);
  const { ranked: dictator, dictatorName } = rankDictator(candidates, votes);

  return {
    ballotId: meta.ballotId,
    ballotName: meta.ballotName,
    officialMethod: meta.officialMethod,
    voteCount: votes.length,
    star: rankStar(candidates, votes),
    ivstar: rankImplicitVetoStar(candidates, votes),
    mj: rankMajorityJudgment(candidates, votes),
    ivmj: rankImplicitVetoMj(candidates, votes),
    borda: rankBorda(candidates, votes),
    irv: rankIrv(candidates, votes),
    condorcet,
    condorcetParadox,
    dictator,
    dictatorName,
  };
}
