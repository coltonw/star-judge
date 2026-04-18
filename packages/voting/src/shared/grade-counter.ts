import { type Candidate, GRADES, type Grade, type Vote } from '@star-judge/shared';

// Build per-candidate grade histograms from a set of votes.
// Missing ratings are treated as 'poor' so the counts always sum to votes.length.
export function buildGradeCounts(
  candidates: Candidate[],
  votes: Vote[]
): Record<string, Record<Grade, number>> {
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
