export const GRADES = ['excellent', 'verygood', 'good', 'average', 'fair', 'poor'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_VALUES: Record<Grade, number> = {
  excellent: 5,
  verygood: 4,
  good: 3,
  average: 2,
  fair: 1,
  poor: 0,
};

export const GRADE_LABELS: Record<Grade, string> = {
  excellent: 'Hyped',
  verygood: 'Into it',
  good: 'Sure',
  average: 'Eh',
  fair: 'Meh',
  poor: 'Hard pass',
};

// Green → red, tuned for dark backgrounds
export const GRADE_COLORS: Record<Grade, string> = {
  excellent: '#52ba8c',
  verygood: '#87bc7a',
  good: '#b0be6e',
  average: '#f5ce62',
  fair: '#e9a268',
  poor: '#dd776e',
};

export const VOTING_METHODS = [
  'star',
  'ivstar',
  'mj',
  'ivmj',
  'borda',
  'irv',
  'condorcet',
  'dictator',
] as const;
export type VotingMethodKey = (typeof VOTING_METHODS)[number];

export const VOTING_METHOD_LABELS: Record<VotingMethodKey, string> = {
  star: 'STAR Voting',
  ivstar: 'IV · STAR Voting',
  mj: 'Majority Judgment',
  ivmj: 'IV · Majority Judgment',
  borda: 'Borda Count',
  irv: 'Instant Runoff (IRV)',
  condorcet: 'Condorcet',
  dictator: 'Dictator',
};

export interface Candidate {
  id: string;
  name: string;
  thumbnail: string;
}

export interface Ballot {
  id: number;
  name: string;
  candidates: Candidate[];
  active: boolean;
  officialMethod: VotingMethodKey;
  created_at: string;
}

export interface Vote {
  id: number;
  ballot_id: number;
  voter_name: string;
  session_id: string;
  ratings: Record<string, Grade>;
  created_at: string;
}

export interface RankedCandidate extends Candidate {
  rank: number;
  gradeCounts: Record<Grade, number>;
  totalVotes: number;
  // STAR-specific
  starScore?: number;
  inRunoff?: boolean;
  // Implicit Veto
  vetoed?: boolean;
  hardPassCount?: number;
  // Borda
  bordaScore?: number;
  // IRV
  irvElimRound?: number; // which round eliminated (undefined = winner)
  // Condorcet
  pairwiseWins?: number; // head-to-head matchups won
  // Dictator
  dictatorGrade?: Grade; // grade the last voter gave this candidate
}

export interface TallyResponse {
  ballotId: number;
  ballotName: string;
  officialMethod: VotingMethodKey;
  voteCount: number;
  star: RankedCandidate[];
  ivstar: RankedCandidate[];
  mj: RankedCandidate[];
  ivmj: RankedCandidate[];
  borda: RankedCandidate[];
  irv: RankedCandidate[];
  condorcet: RankedCandidate[];
  condorcetParadox: boolean;
  dictator: RankedCandidate[];
  dictatorName: string | null;
}
