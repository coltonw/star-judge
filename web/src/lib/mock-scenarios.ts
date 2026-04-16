import type { TallyResponse } from './types'

export interface MockScenario {
  id: string
  label: string
  description: string
  tally: TallyResponse
}

// ─── Scenario 1: Methods Disagree ────────────────────────────────────────────
// Catan wins MJ (polarizing: 4 Hyped + 3 Hard Pass → highest median).
// Pandemic wins STAR (7 Into It → highest total score 28).
const diverge: MockScenario = {
  id: 'mock-diverge',
  label: 'Methods Disagree',
  description: 'MJ picks the polarizing crowd-splitter; STAR picks the crowd-pleaser.',
  tally: {
    ballotId: 0,
    ballotName: 'Game Night — Methods Compared',
    voteCount: 7,
    mj: [
      { id: 'catan',     name: 'Catan',          thumbnail: '', rank: 1, totalVotes: 7,
        gradeCounts: { excellent:4, verygood:0, good:0, average:0, fair:0, poor:3 } },
      { id: 'pandemic',  name: 'Pandemic',        thumbnail: '', rank: 2, totalVotes: 7,
        gradeCounts: { excellent:0, verygood:7, good:0, average:0, fair:0, poor:0 } },
      { id: 'wingspan',  name: 'Wingspan',        thumbnail: '', rank: 3, totalVotes: 7,
        gradeCounts: { excellent:1, verygood:4, good:2, average:0, fair:0, poor:0 } },
      { id: 'codenames', name: 'Codenames',       thumbnail: '', rank: 4, totalVotes: 7,
        gradeCounts: { excellent:0, verygood:4, good:3, average:0, fair:0, poor:0 } },
      { id: 'ttr',       name: 'Ticket to Ride',  thumbnail: '', rank: 5, totalVotes: 7,
        gradeCounts: { excellent:0, verygood:0, good:4, average:3, fair:0, poor:0 } },
    ],
    star: [
      { id: 'pandemic',  name: 'Pandemic',        thumbnail: '', rank: 1, totalVotes: 7, starScore: 28, inRunoff: true,
        gradeCounts: { excellent:0, verygood:7, good:0, average:0, fair:0, poor:0 } },
      { id: 'wingspan',  name: 'Wingspan',        thumbnail: '', rank: 2, totalVotes: 7, starScore: 27, inRunoff: true,
        gradeCounts: { excellent:1, verygood:4, good:2, average:0, fair:0, poor:0 } },
      { id: 'codenames', name: 'Codenames',       thumbnail: '', rank: 3, totalVotes: 7, starScore: 25,
        gradeCounts: { excellent:0, verygood:4, good:3, average:0, fair:0, poor:0 } },
      { id: 'catan',     name: 'Catan',           thumbnail: '', rank: 4, totalVotes: 7, starScore: 20,
        gradeCounts: { excellent:4, verygood:0, good:0, average:0, fair:0, poor:3 } },
      { id: 'ttr',       name: 'Ticket to Ride',  thumbnail: '', rank: 5, totalVotes: 7, starScore: 18,
        gradeCounts: { excellent:0, verygood:0, good:4, average:3, fair:0, poor:0 } },
    ],
  },
}

// ─── Scenario 2: Methods Agree ────────────────────────────────────────────────
// Wingspan dominates both methods with near-unanimous Hyped ratings.
const agree: MockScenario = {
  id: 'mock-agree',
  label: 'Methods Agree',
  description: 'Everyone loves Wingspan — both methods pick it without hesitation.',
  tally: {
    ballotId: 0,
    ballotName: 'Easy Night In',
    voteCount: 5,
    mj: [
      { id: 'wingspan',  name: 'Wingspan',  thumbnail: '', rank: 1, totalVotes: 5,
        gradeCounts: { excellent:4, verygood:1, good:0, average:0, fair:0, poor:0 } },
      { id: 'codenames', name: 'Codenames', thumbnail: '', rank: 2, totalVotes: 5,
        gradeCounts: { excellent:1, verygood:2, good:2, average:0, fair:0, poor:0 } },
      { id: 'azul',      name: 'Azul',      thumbnail: '', rank: 3, totalVotes: 5,
        gradeCounts: { excellent:0, verygood:1, good:2, average:1, fair:1, poor:0 } },
    ],
    star: [
      { id: 'wingspan',  name: 'Wingspan',  thumbnail: '', rank: 1, totalVotes: 5, starScore: 24, inRunoff: true,
        gradeCounts: { excellent:4, verygood:1, good:0, average:0, fair:0, poor:0 } },
      { id: 'codenames', name: 'Codenames', thumbnail: '', rank: 2, totalVotes: 5, starScore: 17, inRunoff: true,
        gradeCounts: { excellent:1, verygood:2, good:2, average:0, fair:0, poor:0 } },
      { id: 'azul',      name: 'Azul',      thumbnail: '', rank: 3, totalVotes: 5, starScore: 13,
        gradeCounts: { excellent:0, verygood:1, good:2, average:1, fair:1, poor:0 } },
    ],
  },
}

// ─── Scenario 3: No Votes ─────────────────────────────────────────────────────
const noVotes: MockScenario = {
  id: 'mock-novotes',
  label: 'No Votes Yet',
  description: 'The ballot is open but nobody has voted yet.',
  tally: {
    ballotId: 0,
    ballotName: 'Friday Night Games',
    voteCount: 0,
    mj: [],
    star: [],
  },
}

// ─── Scenario 4: Perfect Tie ──────────────────────────────────────────────────
// Catan and Pandemic have identical grade distributions across all 7 voters.
// Both methods rank them #1. Wingspan is a clear #3.
const tie: MockScenario = {
  id: 'mock-tie',
  label: 'Perfect Tie',
  description: 'Two games have identical ratings — both methods deadlock at #1.',
  tally: {
    ballotId: 0,
    ballotName: 'Impossible to Choose',
    voteCount: 7,
    mj: [
      { id: 'catan',    name: 'Catan',    thumbnail: '', rank: 1, totalVotes: 7,
        gradeCounts: { excellent:3, verygood:2, good:2, average:0, fair:0, poor:0 } },
      { id: 'pandemic', name: 'Pandemic', thumbnail: '', rank: 1, totalVotes: 7,
        gradeCounts: { excellent:3, verygood:2, good:2, average:0, fair:0, poor:0 } },
      { id: 'wingspan', name: 'Wingspan', thumbnail: '', rank: 3, totalVotes: 7,
        gradeCounts: { excellent:0, verygood:1, good:3, average:3, fair:0, poor:0 } },
    ],
    star: [
      { id: 'catan',    name: 'Catan',    thumbnail: '', rank: 1, totalVotes: 7, starScore: 29, inRunoff: true,
        gradeCounts: { excellent:3, verygood:2, good:2, average:0, fair:0, poor:0 } },
      { id: 'pandemic', name: 'Pandemic', thumbnail: '', rank: 1, totalVotes: 7, starScore: 29, inRunoff: true,
        gradeCounts: { excellent:3, verygood:2, good:2, average:0, fair:0, poor:0 } },
      { id: 'wingspan', name: 'Wingspan', thumbnail: '', rank: 3, totalVotes: 7, starScore: 15,
        gradeCounts: { excellent:0, verygood:1, good:3, average:3, fair:0, poor:0 } },
    ],
  },
}

// ─── Scenario 5: STAR Runoff Flip ─────────────────────────────────────────────
// Cosmic Encounter scores highest (25 pts) but most voters prefer Terra Mystica
// head-to-head, so Terra Mystica wins the runoff despite a lower score (20 pts).
// This shows STAR's anti-polarization property in action.
const runoffFlip: MockScenario = {
  id: 'mock-runoff-flip',
  label: 'STAR Runoff Flip',
  description: "The highest-scoring game loses the runoff — majority preferred the runner-up head-to-head.",
  tally: {
    ballotId: 0,
    ballotName: 'STAR Runoff Demo',
    voteCount: 7,
    mj: [
      { id: 'terra',   name: 'Terra Mystica',     thumbnail: '', rank: 1, totalVotes: 7,
        gradeCounts: { excellent:0, verygood:5, good:0, average:0, fair:0, poor:2 } },
      { id: 'cosmic',  name: 'Cosmic Encounter',  thumbnail: '', rank: 2, totalVotes: 7,
        gradeCounts: { excellent:2, verygood:0, good:5, average:0, fair:0, poor:0 } },
      { id: 'chess',   name: 'Chess',             thumbnail: '', rank: 3, totalVotes: 7,
        gradeCounts: { excellent:0, verygood:0, good:3, average:4, fair:0, poor:0 } },
    ],
    star: [
      // Cosmic scored 25 (2×5 + 5×3) but lost the runoff 2-5 to Terra
      { id: 'terra',   name: 'Terra Mystica',     thumbnail: '', rank: 1, totalVotes: 7, starScore: 20, inRunoff: true,
        gradeCounts: { excellent:0, verygood:5, good:0, average:0, fair:0, poor:2 } },
      { id: 'cosmic',  name: 'Cosmic Encounter',  thumbnail: '', rank: 2, totalVotes: 7, starScore: 25, inRunoff: true,
        gradeCounts: { excellent:2, verygood:0, good:5, average:0, fair:0, poor:0 } },
      { id: 'chess',   name: 'Chess',             thumbnail: '', rank: 3, totalVotes: 7, starScore: 17,
        gradeCounts: { excellent:0, verygood:0, good:3, average:4, fair:0, poor:0 } },
    ],
  },
}

// ─── Scenario 6: Single Vote ──────────────────────────────────────────────────
// Edge case: only one person has voted.
const oneVote: MockScenario = {
  id: 'mock-onevote',
  label: 'Single Vote',
  description: 'Only one voter so far — rankings are just that person\'s ratings.',
  tally: {
    ballotId: 0,
    ballotName: 'Just Me So Far',
    voteCount: 1,
    mj: [
      { id: 'wingspan',  name: 'Wingspan',  thumbnail: '', rank: 1, totalVotes: 1,
        gradeCounts: { excellent:1, verygood:0, good:0, average:0, fair:0, poor:0 } },
      { id: 'catan',     name: 'Catan',     thumbnail: '', rank: 2, totalVotes: 1,
        gradeCounts: { excellent:0, verygood:0, good:1, average:0, fair:0, poor:0 } },
      { id: 'codenames', name: 'Codenames', thumbnail: '', rank: 3, totalVotes: 1,
        gradeCounts: { excellent:0, verygood:0, good:0, average:0, fair:1, poor:0 } },
    ],
    star: [
      { id: 'wingspan',  name: 'Wingspan',  thumbnail: '', rank: 1, totalVotes: 1, starScore: 5, inRunoff: true,
        gradeCounts: { excellent:1, verygood:0, good:0, average:0, fair:0, poor:0 } },
      { id: 'catan',     name: 'Catan',     thumbnail: '', rank: 2, totalVotes: 1, starScore: 3, inRunoff: true,
        gradeCounts: { excellent:0, verygood:0, good:1, average:0, fair:0, poor:0 } },
      { id: 'codenames', name: 'Codenames', thumbnail: '', rank: 3, totalVotes: 1, starScore: 1,
        gradeCounts: { excellent:0, verygood:0, good:0, average:0, fair:1, poor:0 } },
    ],
  },
}

export const MOCK_SCENARIOS: MockScenario[] = [
  diverge, agree, noVotes, tie, runoffFlip, oneVote,
]

export function getMockScenario(id: string): MockScenario | undefined {
  return MOCK_SCENARIOS.find((s) => s.id === id)
}
