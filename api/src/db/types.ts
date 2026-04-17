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
  excellent: 'Hyped',
  verygood: 'Into it',
  good: 'Sure',
  average: 'Eh',
  fair: 'Meh',
  poor: 'Hard pass',
}

export interface Candidate {
  id: string
  name: string
  thumbnail: string
}

export type VotingMethodKey = 'mj' | 'ivmj' | 'star' | 'ivstar' | 'borda' | 'irv' | 'condorcet' | 'dictator'

export interface Ballot {
  id: number
  name: string
  candidates: Candidate[]
  active: boolean
  officialMethod: VotingMethodKey
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
  // STAR-specific
  starScore?: number
  inRunoff?: boolean
  // Implicit Veto
  vetoed?: boolean
  hardPassCount?: number
  // Borda
  bordaScore?: number
  // IRV
  irvElimRound?: number   // which round eliminated (undefined = winner)
  // Condorcet
  pairwiseWins?: number   // head-to-head matchups won
}

export interface TallyResponse {
  ballotId: number
  ballotName: string
  officialMethod: VotingMethodKey
  voteCount: number
  mj: RankedCandidate[]
  star: RankedCandidate[]
  ivmj: RankedCandidate[]
  ivstar: RankedCandidate[]
  borda: RankedCandidate[]
  irv: RankedCandidate[]
  condorcet: RankedCandidate[]
  condorcetParadox: boolean
  dictator: RankedCandidate[]
  dictatorName: string | null
}

export interface Bindings {
  DB: D1Database
  BGG_API_KEY: string
  CLOUDFLARE_ACCESS_AUD: string
  ENVIRONMENT: string
}
