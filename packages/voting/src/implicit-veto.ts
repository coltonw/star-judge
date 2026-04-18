import { type Candidate, GRADE_VALUES, GRADES, type Grade, type RankedCandidate, type Vote } from '@star-judge/shared';
import { rankMajorityJudgment } from './majority-judgment';
import { buildGradeCounts } from './shared/grade-counter';
import { rankStar } from './star';

function countHardPasses(candidates: Candidate[], votes: Vote[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of candidates) counts[c.id] = 0;
  for (const vote of votes) {
    for (const [candidateId, grade] of Object.entries(vote.ratings)) {
      if (grade === 'poor' && candidateId in counts) {
        counts[candidateId]++;
      }
    }
  }
  return counts;
}

function applyVeto(
  candidates: Candidate[],
  votes: Vote[]
): {
  survivors: Candidate[];
  vetoed: Array<{ candidate: Candidate; hardPassCount: number }>;
} {
  const hpCounts = countHardPasses(candidates, votes);
  const minHP = Math.min(...Object.values(hpCounts));

  const survivors: Candidate[] = [];
  const vetoed: Array<{ candidate: Candidate; hardPassCount: number }> = [];

  for (const c of candidates) {
    if (hpCounts[c.id] > minHP) {
      vetoed.push({ candidate: c, hardPassCount: hpCounts[c.id] });
    } else {
      survivors.push(c);
    }
  }

  return { survivors, vetoed };
}

export function rankImplicitVetoMj(candidates: Candidate[], votes: Vote[]): RankedCandidate[] {
  if (votes.length === 0) return rankMajorityJudgment(candidates, votes);

  const { survivors, vetoed } = applyVeto(candidates, votes);
  const vetoedGradeCounts = buildGradeCounts(
    vetoed.map((v) => v.candidate),
    votes
  );

  const survivorResults = rankMajorityJudgment(survivors, votes);
  const nextRank = survivorResults.length + 1;

  const vetoedResults: RankedCandidate[] = vetoed.map(({ candidate, hardPassCount }, i) => ({
    ...candidate,
    rank: nextRank + i,
    gradeCounts: vetoedGradeCounts[candidate.id],
    totalVotes: votes.length,
    vetoed: true,
    hardPassCount,
  }));

  return [...survivorResults, ...vetoedResults];
}

export function rankImplicitVetoStar(candidates: Candidate[], votes: Vote[]): RankedCandidate[] {
  if (votes.length === 0) return rankStar(candidates, votes);

  const { survivors, vetoed } = applyVeto(candidates, votes);
  const vetoedGradeCounts = buildGradeCounts(
    vetoed.map((v) => v.candidate),
    votes
  );

  const survivorResults = rankStar(survivors, votes);
  const nextRank = survivorResults.length + 1;

  const vetoedResults: RankedCandidate[] = vetoed.map(({ candidate, hardPassCount }, i) => {
    const gradeCounts = vetoedGradeCounts[candidate.id];
    const starScore = GRADES.reduce((sum, g) => sum + gradeCounts[g] * GRADE_VALUES[g], 0);
    return {
      ...candidate,
      rank: nextRank + i,
      gradeCounts,
      totalVotes: votes.length,
      starScore,
      vetoed: true,
      hardPassCount,
    };
  });

  return [...survivorResults, ...vetoedResults];
}
