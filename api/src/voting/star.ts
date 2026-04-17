import { GRADES, GRADE_VALUES, type Grade, type Candidate, type RankedCandidate } from '../db/types'
import type { Vote } from '../db/types'

interface ScoredCandidate extends Candidate {
  score: number
  gradeCounts: Record<Grade, number>
}

function countVotes(votes: Vote[]): Record<string, Record<Grade, number>> {
  const counts: Record<string, Record<Grade, number>> = {}
  for (const vote of votes) {
    for (const [candidateId, grade] of Object.entries(vote.ratings)) {
      if (!counts[candidateId]) {
        counts[candidateId] = Object.fromEntries(GRADES.map((g) => [g, 0])) as Record<Grade, number>
      }
      counts[candidateId][grade as Grade]++
    }
  }
  return counts
}

function totalScore(gradeCounts: Record<Grade, number>): number {
  return GRADES.reduce((sum, g) => sum + gradeCounts[g] * GRADE_VALUES[g], 0)
}

// Returns positive if A is preferred, negative if B, 0 if tied
function headToHead(votes: Vote[], a: ScoredCandidate, b: ScoredCandidate): number {
  let aWins = 0
  let bWins = 0
  for (const vote of votes) {
    const gradeA = GRADE_VALUES[vote.ratings[a.id] as Grade] ?? 0
    const gradeB = GRADE_VALUES[vote.ratings[b.id] as Grade] ?? 0
    if (gradeA > gradeB) aWins++
    else if (gradeB > gradeA) bWins++
  }
  return aWins - bWins
}

// Among a group of score-tied candidates, pick the one most preferred pairwise.
// For 2 candidates: simple head-to-head. For 3+: Copeland score (most pairwise wins).
// Returns the winner; if genuinely tied, returns the first in the input array.
function pairwiseTiebreak(votes: Vote[], group: ScoredCandidate[]): ScoredCandidate {
  if (group.length === 1) return group[0]
  if (group.length === 2) {
    return headToHead(votes, group[0], group[1]) >= 0 ? group[0] : group[1]
  }
  const wins = new Map<string, number>(group.map((c) => [c.id, 0]))
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const diff = headToHead(votes, group[i], group[j])
      if (diff > 0) wins.set(group[i].id, (wins.get(group[i].id) ?? 0) + 1)
      else if (diff < 0) wins.set(group[j].id, (wins.get(group[j].id) ?? 0) + 1)
    }
  }
  return group.reduce((best, c) => ((wins.get(c.id) ?? 0) > (wins.get(best.id) ?? 0) ? c : best))
}

// Runoff among all finalists: each vs each, most pairwise wins advances.
// Returns the overall winner.
function runoffWinner(votes: Vote[], finalists: ScoredCandidate[]): ScoredCandidate {
  return pairwiseTiebreak(votes, finalists)
}

export function rankStar(candidates: Candidate[], votes: Vote[]): RankedCandidate[] {
  const counts = countVotes(votes)

  const scored: ScoredCandidate[] = candidates.map((c) => {
    const gradeCounts = counts[c.id] ?? (Object.fromEntries(GRADES.map((g) => [g, 0])) as Record<Grade, number>)
    return { ...c, gradeCounts, score: totalScore(gradeCounts) }
  })

  // Score phase: sort by total score descending
  scored.sort((a, b) => b.score - a.score)

  if (scored.length < 2) {
    return scored.map((c, i) => ({
      ...c,
      rank: i + 1,
      totalVotes: votes.length,
      starScore: c.score,
      inRunoff: true,
    }))
  }

  // ── Determine the two finalists ──────────────────────────────────────────
  // Rule: top scorer advances. If tied for 1st, all tied candidates advance.
  // If clear 1st but tied for 2nd, use pairwise among tied candidates to pick
  // the second finalist.
  const topScore = scored[0].score
  const firstGroup = scored.filter((c) => c.score === topScore)

  let finalists: ScoredCandidate[]

  if (firstGroup.length >= 2) {
    // Multi-way tie for first — all tied candidates are co-finalists
    finalists = firstGroup
  } else {
    // Clear first place; resolve potential tie for 2nd finalist slot
    const belowFirst = scored.slice(1)
    const secondScore = belowFirst[0].score
    const secondGroup = belowFirst.filter((c) => c.score === secondScore)

    if (secondGroup.length === 1) {
      finalists = [scored[0], secondGroup[0]]
    } else {
      // Tie for 2nd: pairwise tiebreak to pick who faces the leader
      const secondFinalist = pairwiseTiebreak(votes, secondGroup)
      finalists = [scored[0], secondFinalist]
    }
  }

  // ── Runoff ────────────────────────────────────────────────────────────────
  const winner = runoffWinner(votes, finalists)
  const finalistIds = new Set(finalists.map((f) => f.id))

  // Build final ordering: winner first, then other finalists, then non-finalists
  const others = scored.filter((c) => !finalistIds.has(c.id))
  const otherFinalists = finalists.filter((c) => c.id !== winner.id)
  const finalOrder = [winner, ...otherFinalists, ...others]

  return finalOrder.map((c, i) => ({
    ...c,
    rank: i + 1,
    totalVotes: votes.length,
    starScore: c.score,
    inRunoff: finalistIds.has(c.id),
  }))
}
