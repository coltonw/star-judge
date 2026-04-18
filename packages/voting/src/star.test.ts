import { describe, expect, it } from 'vitest';
import { rankStar } from './star';
import { c, v, winner } from './test-helpers';

describe('rankStar', () => {
  it('returns single candidate as rank 1 with inRunoff', () => {
    const result = rankStar([c('A')], [v({ A: 'excellent' })]);
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(1);
    expect(result[0].inRunoff).toBe(true);
  });

  it('handles zero votes — all rank by position', () => {
    const result = rankStar([c('A'), c('B'), c('C')], []);
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.totalVotes === 0)).toBe(true);
  });

  it('clear score winner also wins runoff', () => {
    // A is rated excellent by everyone, B rated good
    const votes = [
      v({ A: 'excellent', B: 'good' }),
      v({ A: 'excellent', B: 'good' }),
      v({ A: 'excellent', B: 'good' }),
    ];
    expect(winner(rankStar([c('A'), c('B')], votes))).toBe('A');
  });

  it('runoff winner can differ from top scorer', () => {
    // B has slightly higher score but the majority prefers A head-to-head
    // 3 voters: A=excellent(5), B=verygood(4)  → prefer A
    // 2 voters: A=good(3),      B=excellent(5) → prefer B
    // Score: A = 3*5+2*3 = 21, B = 3*4+2*5 = 22 → B leads scoring
    // Runoff: 3 prefer A, 2 prefer B → A wins
    const votes = [
      v({ A: 'excellent', B: 'verygood' }),
      v({ A: 'excellent', B: 'verygood' }),
      v({ A: 'excellent', B: 'verygood' }),
      v({ A: 'good', B: 'excellent' }),
      v({ A: 'good', B: 'excellent' }),
    ];
    expect(winner(rankStar([c('A'), c('B')], votes))).toBe('A');
  });

  it('marks both finalists as inRunoff', () => {
    const votes = [v({ A: 'excellent', B: 'verygood', C: 'poor' })];
    const result = rankStar([c('A'), c('B'), c('C')], votes);
    const finalists = result.filter((r) => r.inRunoff);
    expect(finalists).toHaveLength(2);
    expect(finalists.map((f) => f.id).sort()).toEqual(['A', 'B']);
  });

  it('three-way score tie — all advance as co-finalists, pairwise picks winner', () => {
    // All get 1 excellent, 1 good, 1 poor → score = 5+3+0 = 8 each (three-way tie)
    const tieVotes = [
      v({ A: 'excellent', B: 'good', C: 'poor' }),
      v({ A: 'good', B: 'poor', C: 'excellent' }),
      v({ A: 'poor', B: 'excellent', C: 'good' }),
    ];
    const result = rankStar([c('A'), c('B'), c('C')], tieVotes);
    // All three are co-finalists (three-way score tie)
    expect(result.every((r) => r.inRunoff)).toBe(true);
  });

  it('tied for 2nd — pairwise picks second finalist', () => {
    // A=excellent by all (score 15). B and C tied for 2nd: B=3+4+2=9, C=3+2+4=9.
    // Head-to-head B vs C: voter1 tie, voter2 B>C, voter3 C>B → 1-1 → B wins (first in array).
    const tieFor2ndVotes = [
      v({ A: 'excellent', B: 'good', C: 'good' }), // B=C (tied)
      v({ A: 'excellent', B: 'verygood', C: 'average' }), // B>C
      v({ A: 'excellent', B: 'average', C: 'verygood' }), // C>B
    ];
    // Score: A=15, B=3+4+2=9, C=3+2+4=9 → tied for 2nd
    // Head-to-head B vs C: voter1 tie, voter2 prefers B, voter3 prefers C → 1-1 tie → first in array (B) wins
    const result = rankStar([c('A'), c('B'), c('C')], tieFor2ndVotes);
    expect(winner(result)).toBe('A'); // A wins runoff (everyone prefers A)
    const finalists = result
      .filter((r) => r.inRunoff)
      .map((r) => r.id)
      .sort();
    expect(finalists).toEqual(['A', 'B']); // B is second finalist, not C
  });

  it('correct grade counts in result', () => {
    const votes = [
      v({ A: 'excellent', B: 'poor' }),
      v({ A: 'excellent', B: 'good' }),
      v({ A: 'verygood', B: 'excellent' }),
    ];
    const result = rankStar([c('A'), c('B')], votes);
    const a = result.find((r) => r.id === 'A')!;
    expect(a.gradeCounts.excellent).toBe(2);
    expect(a.gradeCounts.verygood).toBe(1);
    expect(a.gradeCounts.good).toBe(0);
    expect(a.totalVotes).toBe(3);
  });
});
