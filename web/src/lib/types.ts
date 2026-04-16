export type Grade = 'excellent' | 'verygood' | 'good' | 'average' | 'fair' | 'poor'

export const GRADES: Grade[] = ['excellent', 'verygood', 'good', 'average', 'fair', 'poor']

export const GRADE_LABELS: Record<Grade, string> = {
  excellent: 'Hyped',
  verygood: 'Into it',
  good: 'Sure',
  average: 'Eh',
  fair: 'Meh',
  poor: 'Hard pass',
}

// Colors from green → red, designed for dark backgrounds
export const GRADE_COLORS: Record<Grade, string> = {
  excellent: '#52ba8c',
  verygood: '#87bc7a',
  good: '#b0be6e',
  average: '#f5ce62',
  fair: '#e9a268',
  poor: '#dd776e',
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

export interface RankedCandidate extends Candidate {
  rank: number
  gradeCounts: Record<Grade, number>
  totalVotes: number
  starScore?: number
  inRunoff?: boolean
}

export interface TallyResponse {
  ballotId: number
  ballotName: string
  voteCount: number
  mj: RankedCandidate[]
  star: RankedCandidate[]
}
