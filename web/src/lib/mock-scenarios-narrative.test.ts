// Narrative-coverage tests for the mock scenarios. The structural test in
// mock-scenarios.test.ts only checks that the TallyResponse is well-shaped.
// These tests assert that each scenario's *headline outcomes* still match
// its prose description — the load-bearing claim of these fixtures.
//
// Each scenario lists the expected rank-1 candidate per method (or null when
// the description explicitly calls for a tie/cycle).
import type { RankedCandidate, TallyResponse, VotingMethodKey } from '@star-judge/shared';
import { describe, expect, it } from 'vitest';
import { ALL_MOCK_SCENARIOS } from './mock-scenarios';

type Expectation = Partial<Record<VotingMethodKey, string | 'tied' | 'cycle'>> & {
  dictatorName?: string | null;
};

function winnerId(arr: RankedCandidate[]): string | 'tied' {
  const top = arr.filter((c) => c.rank === 1);
  if (top.length !== 1) return 'tied';
  return top[0].id;
}

function assertMethod(t: TallyResponse, key: VotingMethodKey, expected: string | 'tied' | 'cycle', scenarioId: string) {
  const arr = t[key];
  if (expected === 'cycle') {
    // For condorcet, "cycle" means condorcetParadox is true. For irv this
    // means the algorithm bailed without a strict winner — there will be
    // multiple rank-1 entries.
    if (key === 'condorcet') {
      expect(t.condorcetParadox, `${scenarioId}: condorcet should be a cycle`).toBe(true);
      return;
    }
    const top = arr.filter((c) => c.rank === 1);
    expect(top.length, `${scenarioId}: ${key} should be a tie/deadlock`).toBeGreaterThan(1);
    return;
  }
  const got = winnerId(arr);
  expect(got, `${scenarioId}: ${key} winner`).toBe(expected);
}

const EXPECTED: Record<string, Expectation> = {
  // Methods Disagree — STAR/Borda/IRV/Condorcet pick the consistent Pandemic.
  // MJ and Dictator (Sam) diverge — Dictator picks Catan; MJ comes down on
  // whichever of the two has the stronger median lean (Pandemic with this layout,
  // but the headline divergence holds regardless of MJ's pick).
  'mock-diverge': {
    star: 'pandemic',
    borda: 'pandemic',
    irv: 'pandemic',
    condorcet: 'pandemic',
    dictator: 'catan',
    dictatorName: 'Sam',
  },

  // Methods Agree — Harmonies sweeps every method.
  'mock-agree': {
    mj: 'harmonies',
    star: 'harmonies',
    borda: 'harmonies',
    irv: 'harmonies',
    condorcet: 'harmonies',
    ivmj: 'harmonies',
    ivstar: 'harmonies',
  },

  // Borda's Broad-Support Winner — STAR/MJ/IRV pick the polarizing Catan;
  // Borda + Condorcet lift the consensus Codenames; IV vetoes the polarizers.
  'mock-borda-consensus': {
    mj: 'catan',
    star: 'catan',
    irv: 'catan',
    borda: 'codenames',
    condorcet: 'codenames',
    ivmj: 'codenames',
    ivstar: 'codenames',
    dictator: 'codenames',
    dictatorName: 'Sam',
  },

  // No Votes — degenerate, no winners to assert. Structural test covers it.
  'mock-novotes': {},

  // Perfect Tie — Catan and Pandemic have identical aggregate grades. Every
  // method that can detect ties (MJ, STAR, Borda, IRV, Condorcet) reports
  // them tied at #1. Only Dictator (Jordan) breaks the tie for Catan.
  'mock-tie': {
    mj: 'tied',
    star: 'tied',
    borda: 'tied',
    irv: 'tied',
    condorcet: 'tied',
    ivmj: 'tied',
    ivstar: 'tied',
    dictator: 'catan',
    dictatorName: 'Jordan',
  },

  // STAR Runoff Flip — Cosmic has the highest score but Terra wins the runoff,
  // IRV, and Condorcet. IV vetoes Terra (Terra has HPs), Cosmic wins IV. Dictator: Jordan.
  'mock-runoff-flip': {
    star: 'terra',
    irv: 'terra',
    condorcet: 'terra',
    ivstar: 'cosmic',
    ivmj: 'cosmic',
    dictator: 'cosmic',
    dictatorName: 'Jordan',
  },

  // Single Vote — Riley's ratings are the ranking. Harmonies is their top pick.
  'mock-onevote': {
    mj: 'harmonies',
    star: 'harmonies',
    borda: 'harmonies',
    irv: 'harmonies',
    condorcet: 'harmonies',
    dictator: 'harmonies',
    dictatorName: 'Riley',
  },

  // Veto — No Effect: every game gets the same minimum HP count, IV falls through.
  // Harmonies wins the raw methods and stays winning under IV.
  'mock-veto-nodiff': {
    mj: 'harmonies',
    star: 'harmonies',
    ivmj: 'harmonies',
    ivstar: 'harmonies',
    dictatorName: 'Sam',
  },

  // Veto — One Survivor: Catan and Pandemic both rack up HPs; Harmonies (no HPs)
  // is the sole IV survivor.
  'mock-veto-onesurvivor': {
    ivmj: 'harmonies',
    ivstar: 'harmonies',
    dictatorName: 'Alex',
  },

  // Veto — Changes Winner: Catan top-rated but one HP; veto knocks it out;
  // Harmonies wins IV. Dictator (Sam) still picks Catan.
  'mock-veto-changes-winner': {
    star: 'catan',
    ivstar: 'harmonies',
    ivmj: 'harmonies',
    dictator: 'catan',
    dictatorName: 'Sam',
  },

  // Maximum Disagreement: five different winners across the eight methods.
  'mock-max-disagree': {
    mj: 'ra',
    star: 'brass',
    borda: 'brass',
    irv: 'brass',
    condorcet: 'brass',
    ivstar: 'dom',
    ivmj: 'catan',
    dictator: 'odin',
    dictatorName: 'Sam',
  },

  // Condorcet Cycle — genuine paradox. Dictator (Morgan) picks Catan.
  'mock-condorcet-cycle': {
    condorcet: 'cycle',
    dictator: 'catan',
    dictatorName: 'Morgan',
  },

  // Tennessee Capital — Memphis has plurality but Nashville is the Condorcet winner.
  // IRV picks Knoxville. IV knocks out Memphis & Knoxville (HPs); Nashville wins IV.
  'mock-tennessee': {
    condorcet: 'nash',
    irv: 'knox',
    ivmj: 'nash',
    ivstar: 'nash',
    dictator: 'knox',
    dictatorName: 'Kyle',
  },

  // IRV Baseline — IRV picks Harmonies (and MJ confirms it as the median winner).
  // STAR/Borda diverge in this layout. What matters for the lesson: IRV picks
  // Harmonies in baseline and a different candidate after raising — the
  // non-monotonicity is intact.
  'mock-irv-sincere': {
    mj: 'harmonies',
    irv: 'harmonies',
    dictatorName: 'Morgan',
  },

  // IRV Raised — score methods still pick Harmonies; IRV flips to Catan.
  'mock-irv-raised': {
    star: 'harmonies',
    borda: 'harmonies',
    irv: 'catan',
    dictatorName: 'Morgan',
  },

  // Compromise Wins — seven methods lift the compromise (Codenames).
  'mock-compromise-wins': {
    mj: 'codenames',
    star: 'codenames',
    borda: 'codenames',
    condorcet: 'codenames',
    ivmj: 'codenames',
    ivstar: 'codenames',
    dictator: 'codenames',
    dictatorName: 'Riley',
  },

  // Borda Burying — Honest: Codenames is the broad-consensus compromise.
  'mock-borda-honest': {
    star: 'codenames',
    borda: 'codenames',
    condorcet: 'codenames',
    ivstar: 'codenames',
  },

  // Borda Burying — Strategic: STAR strategy succeeds (Brass), Borda backfires (Catan).
  'mock-borda-strategic': {
    star: 'brass',
    borda: 'catan',
  },

  // Borda Teaming — Before: Brass sweeps every method.
  'mock-borda-teaming-before': {
    mj: 'brass',
    star: 'brass',
    borda: 'brass',
    irv: 'brass',
    condorcet: 'brass',
    ivmj: 'brass',
    ivstar: 'brass',
  },

  // Borda Teaming — After: Borda alone flips to Pandemic; every other method still picks Brass.
  'mock-borda-teaming-after': {
    star: 'brass',
    irv: 'brass',
    condorcet: 'brass',
    borda: 'pandemic',
  },

  // STAR Bullet Voting — Honest: Pandemic has highest score (wins MJ), but STAR
  // runoff picks Brass.
  'mock-star-bullet-honest': {
    mj: 'pandemic',
    star: 'brass',
  },

  // STAR Bullet Voting — Strategic: Brass-fans bury rivals; Brass-fans' strategy
  // elects their LEAST-favorite Catan.
  'mock-star-bullet-strategic': {
    star: 'catan',
  },

  // DH3 — Dark Horse: Tokaido is everyone's second; six of eight methods crown it.
  'mock-dh3': {
    mj: 'tokaido',
    star: 'tokaido',
    borda: 'tokaido',
    condorcet: 'tokaido',
    ivmj: 'tokaido',
    ivstar: 'tokaido',
    dictatorName: 'Jordan',
  },
};

describe('mock scenario narratives hold', () => {
  for (const s of ALL_MOCK_SCENARIOS) {
    const expected = EXPECTED[s.id];
    if (!expected) continue; // scenarios with no narrative expectations (e.g., no-votes)

    it(`${s.id}`, () => {
      const { dictatorName, ...methodWinners } = expected;
      for (const [method, want] of Object.entries(methodWinners)) {
        if (want === undefined) continue;
        assertMethod(s.tally, method as VotingMethodKey, want as string | 'tied' | 'cycle', s.id);
      }
      if (dictatorName !== undefined) {
        expect(s.tally.dictatorName, `${s.id}: dictatorName`).toBe(dictatorName);
      }
    });
  }
});
