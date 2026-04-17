import { type Candidate, GRADES, type Grade, type RankedCandidate, type Vote } from '../db/types';

// Instant Runoff Voting (also called Ranked Choice).
//
// In each round, every voter's ballot counts toward the highest-remaining-rated
// candidate. If multiple candidates tie at the top for a voter, the vote is
// split equally among them. The candidate(s) with the fewest votes are
// eliminated. Repeat until one candidate holds a strict majority, or only one
// remains.

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

export function rankIrv(candidates: Candidate[], votes: Vote[]): RankedCandidate[] {
  const gradeCounts = buildGradeCounts(candidates, votes);

  if (votes.length === 0) {
    return candidates.map((c, i) => ({
      ...c,
      rank: i + 1,
      gradeCounts: gradeCounts[c.id],
      totalVotes: 0,
    }));
  }

  const remaining = new Set(candidates.map((c) => c.id));
  // elimRound[id] = round number when eliminated (1 = first eliminated)
  const elimRound: Record<string, number> = {};
  let round = 0;

  while (remaining.size > 1) {
    round++;
    const voteTotals: Record<string, number> = {};
    for (const id of remaining) voteTotals[id] = 0;

    for (const vote of votes) {
      // Find the best grade any remaining candidate received from this voter
      let bestGrade: Grade | null = null;
      for (const grade of GRADES) {
        if ([...remaining].some((id) => vote.ratings[id] === grade)) {
          bestGrade = grade;
          break;
        }
      }
      if (!bestGrade) continue;

      // Split vote equally among tied top candidates
      const tops = [...remaining].filter((id) => vote.ratings[id] === bestGrade);
      for (const id of tops) voteTotals[id] += 1 / tops.length;
    }

    // Check for majority winner.
    // When found, rank non-winners by their current vote totals so the runner-up
    // (most votes) ends up with rank 2, last place with the lowest rank.
    // Without this, all candidates still in `remaining` would incorrectly get rank 1.
    const majorityWinner = [...remaining].find((id) => voteTotals[id] > votes.length / 2);
    if (majorityWinner) {
      const nonWinners = [...remaining].filter((id) => id !== majorityWinner);
      // Group by vote total — lowest-voted group gets the smallest fakeRound (→ worst rank)
      const uniqueVoteTotals = [...new Set(nonWinners.map((id) => voteTotals[id]))].sort((a, b) => a - b);
      for (let i = 0; i < uniqueVoteTotals.length; i++) {
        const vt = uniqueVoteTotals[i];
        for (const id of nonWinners.filter((nw) => voteTotals[nw] === vt)) {
          remaining.delete(id);
          elimRound[id] = round + i;
        }
      }
      break;
    }

    // Eliminate all candidates tied at the minimum
    const minVotes = Math.min(...[...remaining].map((id) => voteTotals[id]));
    const toElim = [...remaining].filter((id) => voteTotals[id] <= minVotes);

    // Safety: never eliminate everyone in one round
    if (toElim.length >= remaining.size) break;

    for (const id of toElim) {
      remaining.delete(id);
      elimRound[id] = round;
    }
  }

  // Build the result.
  // Winners (still in `remaining`) get rank 1.
  // Eliminated in the final round get rank 2, one round before = rank 3, etc.
  // Candidates eliminated in the same round share a rank.
  const candMap = Object.fromEntries(candidates.map((c) => [c.id, c]));

  const result: RankedCandidate[] = [];

  // Winners
  for (const id of remaining) {
    result.push({ ...candMap[id], rank: 1, gradeCounts: gradeCounts[id], totalVotes: votes.length });
  }

  // Eliminated: last-eliminated = rank remaining.size + 1
  const byRound = new Map<number, string[]>();
  for (const [id, r] of Object.entries(elimRound)) {
    if (!byRound.has(r)) byRound.set(r, []);
    byRound.get(r)!.push(id);
  }
  const roundsDesc = [...byRound.keys()].sort((a, b) => b - a);
  let rankPos = remaining.size + 1;
  for (const r of roundsDesc) {
    const group = byRound.get(r)!;
    for (const id of group) {
      result.push({
        ...candMap[id],
        rank: rankPos,
        gradeCounts: gradeCounts[id],
        totalVotes: votes.length,
        irvElimRound: elimRound[id],
      });
    }
    rankPos += group.length;
  }

  return result;
}
