import { type Candidate, GRADES, type Grade, type RankedCandidate, type Vote } from '@star-judge/shared';

type DistancePair = [Grade, number];
type Tallies = Partial<Record<Grade, number>>;

// Count all votes into per-candidate grade tallies
function countVotes(votes: Vote[]): Record<string, Tallies> {
  const tallies: Record<string, Tallies> = {};
  for (const vote of votes) {
    for (const [candidateId, grade] of Object.entries(vote.ratings)) {
      if (!tallies[candidateId]) tallies[candidateId] = {};
      tallies[candidateId][grade as Grade] = (tallies[candidateId][grade as Grade] ?? 0) + 1;
    }
  }
  return tallies;
}

// Find the number of median votes that must be removed before the rating
// would change. This version handles ratings >= median (above or at median).
function distanceAbove(ratingVotes: number, total: number, accumAbove: number): [number, number] {
  const ratingAndAbove = ratingVotes + accumAbove;
  if (ratingAndAbove >= total / 2) {
    return [0, ratingAndAbove];
  }
  return [total - ratingAndAbove * 2, ratingAndAbove];
}

// Same but for ratings <= median (below or at median).
function distanceBelow(ratingVotes: number, total: number, accumBelow: number): [number, number] {
  const ratingAndBelow = ratingVotes + accumBelow;
  if (ratingAndBelow > total / 2) {
    return [0, ratingAndBelow];
  }
  return [total - ratingAndBelow * 2 + 1, ratingAndBelow];
}

type DistanceFn = (votes: number, total: number, accum: number) => [number, number];

// Recursive distance computation — faithfully ported from the Elixir original.
function _distance(
  ratings: readonly Grade[],
  tallies: Tallies,
  total: number,
  fn: DistanceFn,
  accumVotes: number,
  accumResult: DistancePair[]
): DistancePair[] {
  if (ratings.length === 0) return accumResult;

  const [rating, ...rest] = ratings;
  const ratingVotes = tallies[rating];

  if (ratingVotes === undefined) {
    return _distance(rest, tallies, total, fn, accumVotes, accumResult);
  }

  const [dist, newAccum] = fn(ratingVotes, total, accumVotes);
  const newResult: DistancePair[] = [...accumResult, [rating, dist]];

  if (dist === 0) {
    // Found the median — switch to distanceBelow and walk remaining in reverse
    return _distance([...rest].reverse(), tallies, total, distanceBelow, 0, newResult);
  }

  return _distance(rest, tallies, total, fn, newAccum, newResult);
}

function computeDistances(tallies: Tallies): DistancePair[] {
  const total = Object.values(tallies).reduce((sum, v) => sum + (v ?? 0), 0);
  const result = _distance(GRADES, tallies, total, distanceAbove, 0, []);
  return result.sort((a, b) => a[1] - b[1]);
}

// Compare two distance arrays. Returns true if a should rank before b (a wins).
// Faithfully ported from _compare/2 in lib/majudge.ex.
function compareDistances(a: DistancePair[], b: DistancePair[]): boolean {
  if (a.length === 0 && b.length === 0) return true;
  if (b.length === 0) return true;
  if (a.length === 0) return false;

  const [aRating] = a[0];
  const [bRating] = b[0];

  // Different leading ratings — better grade wins outright
  if (aRating !== bRating) {
    return GRADES.indexOf(aRating) <= GRADES.indexOf(bRating);
  }

  // Same leading rating — tiebreaker logic
  if (a.length === 1 && b.length === 1) {
    return GRADES.indexOf(aRating) <= GRADES.indexOf(bRating);
  }
  if (b.length === 1) return compareDistances(a.slice(1), b);
  if (a.length === 1) return compareDistances(a, b.slice(1));

  const aDist = a[1][1];
  const bDist = b[1][1];

  if (aDist < bDist) return compareDistances(a.slice(1), b);
  if (aDist > bDist) return compareDistances(a, b.slice(1));
  return compareDistances(a.slice(1), b.slice(1));
}

export function rankMajorityJudgment(candidates: Candidate[], votes: Vote[]): RankedCandidate[] {
  const tallyCounts = countVotes(votes);

  const ranked = candidates.map((candidate) => {
    const tallies: Tallies = tallyCounts[candidate.id] ?? {};
    const gradeCounts = Object.fromEntries(GRADES.map((g) => [g, tallies[g] ?? 0])) as Record<Grade, number>;

    return {
      ...candidate,
      gradeCounts,
      totalVotes: votes.length,
      _distances: computeDistances(tallies),
    };
  });

  ranked.sort((a, b) => (compareDistances(a._distances, b._distances) ? -1 : 1));

  return ranked.map(({ _distances: _, ...c }, i) => ({ ...c, rank: i + 1 }));
}
