import { type Candidate, GRADE_VALUES, GRADES, type Grade, type RankedCandidate, type Vote } from '@star-judge/shared';

// Dictator method: the last person to vote decides everything.
// Their ratings are used as the sole ranking criterion.
// The displayed grade bars still show all votes so you can see the contrast.

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

export function rankDictator(
  candidates: Candidate[],
  votes: Vote[]
): {
  ranked: RankedCandidate[];
  dictatorName: string | null;
} {
  const gradeCounts = buildGradeCounts(candidates, votes);

  if (votes.length === 0) {
    return {
      ranked: candidates.map((c, i) => ({
        ...c,
        rank: i + 1,
        gradeCounts: gradeCounts[c.id],
        totalVotes: 0,
      })),
      dictatorName: null,
    };
  }

  // Last vote by insertion order (queries are sorted by created_at ASC)
  const dictatorVote = votes[votes.length - 1];

  const dictatorGrades: Record<string, Grade> = {};
  const dictatorValues: Record<string, number> = {};
  for (const c of candidates) {
    const grade = (dictatorVote.ratings[c.id] ?? 'poor') as Grade;
    dictatorGrades[c.id] = grade;
    dictatorValues[c.id] = GRADE_VALUES[grade];
  }

  const sorted = [...candidates].sort((a, b) => dictatorValues[b.id] - dictatorValues[a.id]);

  return {
    ranked: sorted.map((c) => ({
      ...c,
      rank: sorted.findIndex((s) => dictatorValues[s.id] === dictatorValues[c.id]) + 1,
      gradeCounts: gradeCounts[c.id],
      totalVotes: votes.length,
      dictatorGrade: dictatorGrades[c.id],
    })),
    dictatorName: dictatorVote.voter_name,
  };
}
