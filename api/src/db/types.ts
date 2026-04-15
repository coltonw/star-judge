export type Grade = 'excellent' | 'verygood' | 'good' | 'average' | 'fair' | 'poor'

export const GRADES: Grade[] = ['excellent', 'verygood', 'good', 'average', 'fair', 'poor']

export const GRADE_VALUES: Record<Grade, number> = {
  excellent: 5,
  verygood: 4,
  good: 3,
  average: 2,
  fair: 1,
  poor: 0,
}

export const GRADE_LABELS: Record<Grade, string> = {
  excellent: 'Excellent',
  verygood: 'Very Good',
  good: 'Good',
  average: 'Average',
  fair: 'Fair',
  poor: 'Poor',
}

export interface Candidate {
  id: string
  name: string
  thumbnail: string
}

export interface Ballot {
  id: number
  name: string
  candidates: Candidate[]
  active: boolean
  created_at: string
}

export interface Vote {
  id: number
  ballot_id: number
  voter_name: string
  session_id: string
  ratings: Record<string, Grade>
  created_at: string
}

export interface RankedCandidate extends Candidate {
  rank: number
  gradeCounts: Record<Grade, number>
  totalVotes: number
  // STAR-specific fields (only present on star results)
  starScore?: number   // raw sum of grade values across all voters
  inRunoff?: boolean   // whether this candidate reached the runoff phase
}

export interface TallyResponse {
  ballotId: number
  ballotName: string
  voteCount: number
  mj: RankedCandidate[]
  star: RankedCandidate[]
}

export interface Bindings {
  DB: D1Database
  BGG_API_KEY: string
  CLOUDFLARE_ACCESS_AUD: string
  ENVIRONMENT: string
}
