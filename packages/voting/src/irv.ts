import { type Candidate, GRADES, type Grade, type RankedCandidate, type Vote } from '@star-judge/shared';
import { buildGradeCounts } from './shared/grade-counter';

// Instant Runoff Voting (also called Ranked Choice).
//
// In each round, every voter's ballot counts toward the highest-remaining-rated
// candidate. If multiple candidates tie at the top for a voter, the vote is
// split equally among them. The candidate(s) with the fewest votes are
// eliminated. Repeat until one candidate holds a strict majority, or only one
// remains.
//
// We scale every vote by SCALE = lcm(1..N) so split votes stay in exact
// integer arithmetic — no float drift to cause edge-case rank flips.

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

function lcmRange(n: number): number {
  let acc = 1;
  for (let i = 2; i <= n; i++) acc = lcm(acc, i);
  return acc;
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

  const SCALE = lcmRange(Math.max(1, candidates.length));
  const majorityThreshold = votes.length * SCALE;

  const remaining = new Set(candidates.map((c) => c.id));
  const elimRound: Record<string, number> = {};
  let round = 0;

  while (remaining.size > 1) {
    round++;
    const voteTotals: Record<string, number> = {};
    for (const id of remaining) voteTotals[id] = 0;

    for (const vote of votes) {
      let bestGrade: Grade | null = null;
      for (const grade of GRADES) {
        if ([...remaining].some((id) => vote.ratings[id] === grade)) {
          bestGrade = grade;
          break;
        }
      }
      if (!bestGrade) continue;

      const tops = [...remaining].filter((id) => vote.ratings[id] === bestGrade);
      const share = SCALE / tops.length;
      for (const id of tops) voteTotals[id] += share;
    }

    // Strict majority: vote total * 2 > total voters * SCALE
    const majorityWinner = [...remaining].find((id) => voteTotals[id] * 2 > majorityThreshold);
    if (majorityWinner) {
      const nonWinners = [...remaining].filter((id) => id !== majorityWinner);
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

    const minVotes = Math.min(...[...remaining].map((id) => voteTotals[id]));
    const toElim = [...remaining].filter((id) => voteTotals[id] <= minVotes);

    if (toElim.length >= remaining.size) break;

    for (const id of toElim) {
      remaining.delete(id);
      elimRound[id] = round;
    }
  }

  const candMap = Object.fromEntries(candidates.map((c) => [c.id, c]));
  const result: RankedCandidate[] = [];

  for (const id of remaining) {
    result.push({ ...candMap[id], rank: 1, gradeCounts: gradeCounts[id], totalVotes: votes.length });
  }

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
