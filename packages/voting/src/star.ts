import { type Candidate, GRADE_VALUES, GRADES, type Grade, type RankedCandidate, type Vote } from '@star-judge/shared';
import { buildGradeCounts } from './shared/grade-counter';
import { pairwiseWinner } from './shared/pairwise';

interface ScoredCandidate extends Candidate {
  score: number;
  gradeCounts: Record<Grade, number>;
}

function totalScore(gradeCounts: Record<Grade, number>): number {
  return GRADES.reduce((sum, g) => sum + gradeCounts[g] * GRADE_VALUES[g], 0);
}

export function rankStar(candidates: Candidate[], votes: Vote[]): RankedCandidate[] {
  const counts = buildGradeCounts(candidates, votes);

  const scored: ScoredCandidate[] = candidates.map((c) => {
    const gradeCounts = counts[c.id];
    return { ...c, gradeCounts, score: totalScore(gradeCounts) };
  });

  // Score phase: sort by total score descending
  scored.sort((a, b) => b.score - a.score);

  if (scored.length < 2) {
    return scored.map((c, i) => ({
      ...c,
      rank: i + 1,
      totalVotes: votes.length,
      starScore: c.score,
      inRunoff: true,
    }));
  }

  // ── Determine the two finalists ──────────────────────────────────────────
  // Rule: top scorer advances. If tied for 1st, all tied candidates advance.
  // If clear 1st but tied for 2nd, use pairwise among tied candidates to pick
  // the second finalist.
  const topScore = scored[0].score;
  const firstGroup = scored.filter((c) => c.score === topScore);

  let finalists: ScoredCandidate[];

  if (firstGroup.length >= 2) {
    finalists = firstGroup;
  } else {
    const belowFirst = scored.slice(1);
    const secondScore = belowFirst[0].score;
    const secondGroup = belowFirst.filter((c) => c.score === secondScore);

    if (secondGroup.length === 1) {
      finalists = [scored[0], secondGroup[0]];
    } else {
      const secondFinalist = pairwiseWinner(votes, secondGroup);
      finalists = [scored[0], secondFinalist];
    }
  }

  // ── Runoff ────────────────────────────────────────────────────────────────
  const winner = pairwiseWinner(votes, finalists);
  const finalistIds = new Set(finalists.map((f) => f.id));

  const others = scored.filter((c) => !finalistIds.has(c.id));
  const otherFinalists = finalists.filter((c) => c.id !== winner.id);
  const finalOrder = [winner, ...otherFinalists, ...others];

  return finalOrder.map((c, i) => ({
    ...c,
    rank: i + 1,
    totalVotes: votes.length,
    starScore: c.score,
    inRunoff: finalistIds.has(c.id),
  }));
}
