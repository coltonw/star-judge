import { type Candidate, GRADES, type Grade, type RankedCandidate, type Vote } from '../db/types';

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

// Standard Borda count with fractional points for tied grades.
// With N candidates, rank 1 earns N-1 pts, rank 2 earns N-2 pts, ...
// Ties in grade evenly split the points for the positions they occupy.
export function rankBorda(candidates: Candidate[], votes: Vote[]): RankedCandidate[] {
  const n = candidates.length;
  const gradeCounts = buildGradeCounts(candidates, votes);
  const bordaScores: Record<string, number> = Object.fromEntries(candidates.map((c) => [c.id, 0]));

  for (const vote of votes) {
    // Group candidates by grade for this voter (best → worst)
    let pos = 0;
    for (const grade of GRADES) {
      const group = candidates.filter((c) => (vote.ratings[c.id] ?? 'poor') === grade);
      if (group.length === 0) continue;
      // Points for positions pos..pos+group.length-1 averaged
      const topPts = n - 1 - pos;
      const botPts = n - 1 - (pos + group.length - 1);
      const avgPts = (topPts + botPts) / 2;
      for (const c of group) bordaScores[c.id] += avgPts;
      pos += group.length;
    }
  }

  const scored = candidates
    .map((c) => ({ ...c, gradeCounts: gradeCounts[c.id], totalVotes: votes.length, bordaScore: bordaScores[c.id] }))
    .sort((a, b) => b.bordaScore - a.bordaScore);

  return scored.map((c, _i) => ({
    ...c,
    rank: scored.findIndex((s) => s.bordaScore === c.bordaScore) + 1,
  }));
}
