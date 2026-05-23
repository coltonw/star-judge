import type { Candidate, RankedCandidate, Vote } from '@star-judge/shared';
import { rankMajorityJudgment } from './majority-judgment';
import { rankStar } from './star';

type Ranker = (candidates: Candidate[], votes: Vote[]) => RankedCandidate[];

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

function partitionByVeto(
  candidates: Candidate[],
  hpCounts: Record<string, number>
): { survivors: Candidate[]; vetoed: Candidate[] } {
  const minHP = Math.min(...Object.values(hpCounts));
  const survivors: Candidate[] = [];
  const vetoed: Candidate[] = [];
  for (const c of candidates) {
    if (hpCounts[c.id] > minHP) vetoed.push(c);
    else survivors.push(c);
  }
  return { survivors, vetoed };
}

// Wraps a base ranker so that candidates with disproportionate "hard pass" votes
// are removed before ranking, then ranked among themselves at the tail. The
// inner ranker is reused on the vetoed subset so method-specific fields
// (starScore, gradeCounts, …) come out without the decorator knowing about them.
function withImplicitVeto(rank: Ranker): Ranker {
  return (candidates, votes) => {
    if (votes.length === 0) return rank(candidates, votes);

    const hpCounts = countHardPasses(candidates, votes);
    const { survivors, vetoed } = partitionByVeto(candidates, hpCounts);
    if (vetoed.length === 0) return rank(survivors, votes);

    const top = rank(survivors, votes);
    const bottom = rank(vetoed, votes).map((r) => ({
      ...r,
      rank: r.rank + top.length,
      vetoed: true,
      hardPassCount: hpCounts[r.id],
    }));
    return [...top, ...bottom];
  };
}

export const rankImplicitVetoMj = withImplicitVeto(rankMajorityJudgment);
export const rankImplicitVetoStar = withImplicitVeto(rankStar);
