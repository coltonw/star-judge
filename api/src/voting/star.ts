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

// Returns true if candidate A is preferred over B by this voter
function prefers(vote: Vote, candidateA: string, candidateB: string): boolean {
  const gradeA = GRADE_VALUES[vote.ratings[candidateA] as Grade] ?? 0
  const gradeB = GRADE_VALUES[vote.ratings[candidateB] as Grade] ?? 0
  return gradeA > gradeB
}

function runoff(votes: Vote[], a: ScoredCandidate, b: ScoredCandidate): ScoredCandidate {
  let aWins = 0
  let bWins = 0
  for (const vote of votes) {
    if (prefers(vote, a.id, b.id)) aWins++
    else if (prefers(vote, b.id, a.id)) bWins++
  }
  // Tie goes to the higher-scored candidate (already sorted)
  return aWins >= bWins ? a : b
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
    return scored.map((c, i) => ({ ...c, rank: i + 1, totalVotes: votes.length }))
  }

  // Runoff phase: top 2 go head-to-head
  const [first, second, ...rest] = scored
  const winner = runoff(votes, first, second)
  const loser = winner.id === first.id ? second : first

  // Final ranking: winner, loser, then the rest by score
  const finalOrder = [winner, loser, ...rest]
  return finalOrder.map((c, i) => ({ ...c, rank: i + 1, totalVotes: votes.length }))
}
