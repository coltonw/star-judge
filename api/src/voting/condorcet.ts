import { type Candidate, GRADE_VALUES, GRADES, type Grade, type RankedCandidate, type Vote } from '../db/types';

// Condorcet method.
//
// For every pair of candidates (A, B), count how many voters rated A higher
// than B. If A wins more matchups than B, A "beats" B pairwise.
//
// The Condorcet winner is the candidate that beats every other candidate.
// If no such candidate exists (A > B > C > A cycle), hasParadox = true and
// there is no Condorcet winner — candidates are ranked by Copeland score
// (number of pairwise wins).

function buildGradeCounts(candidates: Candidate[], votes: Vote[]): Record<string, Record<Grade, number>> {
  const counts: Record<string, Record<Grade, number>> = {};
  for (const c of candidates) {
    counts[c.id] = Object.fromEntries(GRADES.map((g) => [g, 0])) as Record<Grade, number>;
  }
  for (const vote of votes) {
    for (const c of candidates) {
      const grade = (vote.ratings[c.id] ?? 'poor') as Grade;
      counts[c.id][grade]++;
    }
  }
  return counts;
}

export function rankCondorcet(
  candidates: Candidate[],
  votes: Vote[]
): {
  ranked: RankedCandidate[];
  hasParadox: boolean;
} {
  const gradeCounts = buildGradeCounts(candidates, votes);
  const n = candidates.length;

  if (votes.length === 0 || n < 2) {
    return {
      ranked: candidates.map((c, i) => ({
        ...c,
        rank: i + 1,
        gradeCounts: gradeCounts[c.id],
        totalVotes: votes.length,
        pairwiseWins: 0,
      })),
      hasParadox: false,
    };
  }

  // prefWins[a][b] = number of voters who prefer a over b
  const prefWins: Record<string, Record<string, number>> = {};
  for (const c of candidates) {
    prefWins[c.id] = {};
    for (const d of candidates) prefWins[c.id][d.id] = 0;
  }

  for (const vote of votes) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = candidates[i].id;
        const b = candidates[j].id;
        const ga = GRADE_VALUES[(vote.ratings[a] ?? 'poor') as Grade];
        const gb = GRADE_VALUES[(vote.ratings[b] ?? 'poor') as Grade];
        if (ga > gb) prefWins[a][b]++;
        else if (gb > ga) prefWins[b][a]++;
        // exact ties: neither wins the matchup
      }
    }
  }

  // Copeland score: number of pairwise matchups won (> half)
  const pairwiseWins: Record<string, number> = {};
  for (const c of candidates) {
    pairwiseWins[c.id] = 0;
    for (const d of candidates) {
      if (c.id === d.id) continue;
      if (prefWins[c.id][d.id] > prefWins[d.id][c.id]) pairwiseWins[c.id]++;
    }
  }

  // A Condorcet winner beats every other candidate (score = n - 1)
  const hasCondorcetWinner = candidates.some((c) => pairwiseWins[c.id] === n - 1);
  const hasParadox = !hasCondorcetWinner;

  const sorted = [...candidates].sort((a, b) => pairwiseWins[b.id] - pairwiseWins[a.id]);

  return {
    ranked: sorted.map((c) => ({
      ...c,
      rank: sorted.findIndex((s) => pairwiseWins[s.id] === pairwiseWins[c.id]) + 1,
      gradeCounts: gradeCounts[c.id],
      totalVotes: votes.length,
      pairwiseWins: pairwiseWins[c.id],
    })),
    hasParadox,
  };
}
