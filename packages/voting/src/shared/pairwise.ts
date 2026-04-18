import { GRADE_VALUES, type Grade, type Vote } from '@star-judge/shared';

// Head-to-head score: positive means A is preferred to B by more voters,
// negative means B is preferred, 0 means genuinely tied.
export function headToHead(votes: Vote[], aId: string, bId: string): number {
  let aWins = 0;
  let bWins = 0;
  for (const vote of votes) {
    const gradeA = GRADE_VALUES[vote.ratings[aId] as Grade] ?? 0;
    const gradeB = GRADE_VALUES[vote.ratings[bId] as Grade] ?? 0;
    if (gradeA > gradeB) aWins++;
    else if (gradeB > gradeA) bWins++;
  }
  return aWins - bWins;
}

// Copeland score: for each candidate in the group, the number of other
// candidates it beats in head-to-head comparisons. Ties count for neither side.
export function copelandScores<T extends { id: string }>(votes: Vote[], group: T[]): Map<string, number> {
  const wins = new Map<string, number>(group.map((c) => [c.id, 0]));
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const diff = headToHead(votes, group[i].id, group[j].id);
      if (diff > 0) wins.set(group[i].id, (wins.get(group[i].id) ?? 0) + 1);
      else if (diff < 0) wins.set(group[j].id, (wins.get(group[j].id) ?? 0) + 1);
    }
  }
  return wins;
}

// Pick the pairwise winner among a group. For 1 candidate, trivial. For 2,
// simple head-to-head. For 3+, the candidate with the most Copeland wins.
// If genuinely tied, returns the first tied candidate in input order.
export function pairwiseWinner<T extends { id: string }>(votes: Vote[], group: T[]): T {
  if (group.length === 1) return group[0];
  if (group.length === 2) {
    return headToHead(votes, group[0].id, group[1].id) >= 0 ? group[0] : group[1];
  }
  const wins = copelandScores(votes, group);
  return group.reduce((best, c) => ((wins.get(c.id) ?? 0) > (wins.get(best.id) ?? 0) ? c : best));
}
