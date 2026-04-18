import type { RankedCandidate, TallyResponse } from '@star-judge/shared';
import { describe, expect, it } from 'vitest';
import { computeConsensus, pickTiebreaker, summarizeMethods, winnerLabel } from './consensus';

function rank(name: string, rank: number, extras: Record<string, unknown> = {}): RankedCandidate {
  return {
    id: name,
    name,
    thumbnail: '',
    rank,
    totalVotes: 1,
    gradeCounts: { excellent: 0, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
    ...extras,
  };
}

function makeTally(overrides: Partial<TallyResponse> = {}): TallyResponse {
  const ranked = [rank('A', 1), rank('B', 2)];
  return {
    ballotId: 1,
    ballotName: 'Test',
    officialMethod: 'mj',
    voteCount: 1,
    star: ranked,
    ivstar: ranked,
    mj: ranked,
    ivmj: ranked,
    borda: ranked,
    irv: ranked,
    condorcet: ranked,
    condorcetParadox: false,
    dictator: ranked,
    dictatorName: 'Alice',
    ...overrides,
  };
}

describe('winnerLabel', () => {
  it('returns cycle marker when paradox is true', () => {
    expect(winnerLabel([rank('A', 1)], true)).toBe('🔄 Cycle');
  });

  it('ignores vetoed candidates when finding the winner', () => {
    const ranked = [rank('A', 1, { vetoed: true }), rank('B', 2)];
    expect(winnerLabel(ranked)).toBe('B');
  });

  it('formats ties with & separator and (tie) suffix', () => {
    const ranked = [rank('A', 1), rank('B', 1), rank('C', 3)];
    expect(winnerLabel(ranked)).toBe('A & B (tie)');
  });

  it('returns em-dash when there are no survivors', () => {
    expect(winnerLabel([rank('A', 1, { vetoed: true })])).toBe('—');
  });
});

describe('summarizeMethods', () => {
  it('puts the official method first', () => {
    const tally = makeTally({ officialMethod: 'borda' });
    expect(summarizeMethods(tally)[0].key).toBe('borda');
  });

  it('covers all 8 methods', () => {
    const methods = summarizeMethods(makeTally());
    expect(methods.map((m) => m.key).sort()).toEqual([
      'borda',
      'condorcet',
      'dictator',
      'irv',
      'ivmj',
      'ivstar',
      'mj',
      'star',
    ]);
  });

  it('suppresses dictator winner when no dictatorName is set', () => {
    const tally = makeTally({ dictatorName: null });
    const dictator = summarizeMethods(tally).find((m) => m.key === 'dictator')!;
    expect(dictator.winner).toBe('—');
  });
});

describe('computeConsensus', () => {
  it('returns null when vote count is zero', () => {
    const tally = makeTally({ voteCount: 0 });
    expect(computeConsensus(tally, summarizeMethods(tally))).toBeNull();
  });

  it('returns the shared winner when all methods agree', () => {
    const tally = makeTally();
    expect(computeConsensus(tally, summarizeMethods(tally))).toBe('A');
  });

  it('excludes condorcet when a paradox is present', () => {
    const disagree = [rank('B', 1), rank('A', 2)];
    // All methods pick A *except* condorcet (which is in paradox — should be ignored)
    const tally = makeTally({ condorcet: disagree, condorcetParadox: true });
    expect(computeConsensus(tally, summarizeMethods(tally))).toBe('A');
  });

  it('returns null when methods disagree', () => {
    const tally = makeTally({ borda: [rank('B', 1), rank('A', 2)] });
    expect(computeConsensus(tally, summarizeMethods(tally))).toBeNull();
  });
});

describe('pickTiebreaker', () => {
  it('returns null when consensus is not a tie', () => {
    expect(pickTiebreaker(makeTally(), 'A')).toBeNull();
    expect(pickTiebreaker(makeTally(), null)).toBeNull();
  });

  it('picks one name deterministically from a tied consensus', () => {
    const tally = makeTally({ ballotId: 2, voteCount: 3 });
    const pick = pickTiebreaker(tally, 'A & B (tie)');
    expect(['A', 'B']).toContain(pick);
    // Stable across calls
    expect(pickTiebreaker(tally, 'A & B (tie)')).toBe(pick);
  });
});
