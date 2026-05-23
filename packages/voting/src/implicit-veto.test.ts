import type { RankedCandidate } from '@star-judge/shared';
import { describe, expect, it } from 'vitest';
import { rankImplicitVetoMj, rankImplicitVetoStar } from './implicit-veto';
import { c, v, winner } from './test-helpers';

function find(results: RankedCandidate[], id: string): RankedCandidate {
  return results.find((r) => r.id === id)!;
}

// Shared-behavior tests target rankImplicitVetoMj; the veto logic lives in a
// single decorator shared with rankImplicitVetoStar.
describe('implicit veto (shared behavior)', () => {
  it('no hard passes — no candidates vetoed', () => {
    const votes = [v({ A: 'excellent', B: 'good', C: 'verygood' }), v({ A: 'excellent', B: 'good', C: 'verygood' })];
    const result = rankImplicitVetoMj([c('A'), c('B'), c('C')], votes);
    expect(result.every((r) => !r.vetoed)).toBe(true);
  });

  it('all candidates equally hard-passed — none vetoed', () => {
    // Everyone gets 1 hard pass → minHP = 1, no one exceeds it
    const votes = [
      v({ A: 'poor', B: 'excellent', C: 'good' }),
      v({ A: 'excellent', B: 'poor', C: 'good' }),
      v({ A: 'excellent', B: 'good', C: 'poor' }),
    ];
    const result = rankImplicitVetoMj([c('A'), c('B'), c('C')], votes);
    expect(result.every((r) => !r.vetoed)).toBe(true);
  });

  it('candidate with more hard passes than minimum is vetoed', () => {
    // A: 0 hard passes, B: 0 hard passes, C: 2 hard passes
    // minHP = 0, C is vetoed (2 > 0)
    const votes = [
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'good' }),
    ];
    const result = rankImplicitVetoMj([c('A'), c('B'), c('C')], votes);
    expect(find(result, 'C').vetoed).toBe(true);
    expect(find(result, 'A').vetoed).toBeFalsy();
    expect(find(result, 'B').vetoed).toBeFalsy();
  });

  it('vetoed candidate is ranked last', () => {
    const votes = [
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'good' }),
    ];
    const result = rankImplicitVetoMj([c('A'), c('B'), c('C')], votes);
    const c_ = find(result, 'C');
    const a = find(result, 'A');
    const b = find(result, 'B');
    expect(c_.rank).toBeGreaterThan(a.rank);
    expect(c_.rank).toBeGreaterThan(b.rank);
  });

  it('vetoed candidate has hardPassCount set', () => {
    const votes = [v({ A: 'excellent', B: 'poor' }), v({ A: 'excellent', B: 'poor' })];
    const result = rankImplicitVetoMj([c('A'), c('B')], votes);
    const b = find(result, 'B');
    expect(b.vetoed).toBe(true);
    expect(b.hardPassCount).toBe(2);
  });

  it('veto winner same as base method when no vetoes', () => {
    const votes = [v({ A: 'excellent', B: 'good' }), v({ A: 'excellent', B: 'good' })];
    const ivResult = rankImplicitVetoMj([c('A'), c('B')], votes);
    expect(winner(ivResult)).toBe('A');
  });

  it('zero votes — falls through to base method with no vetoes', () => {
    const result = rankImplicitVetoMj([c('A'), c('B')], []);
    expect(result.every((r) => !r.vetoed)).toBe(true);
  });
});

describe('implicit veto (STAR-specific)', () => {
  it('veto removes candidate that would otherwise win', () => {
    // C gets rated poor by everyone, so gets vetoed. A and B have 0 hard passes
    // and symmetric ratings — they share rank 1 after the veto.
    const votes = [v({ A: 'excellent', B: 'verygood', C: 'poor' }), v({ A: 'verygood', B: 'excellent', C: 'poor' })];
    const result = rankImplicitVetoStar([c('A'), c('B'), c('C')], votes);
    expect(find(result, 'C').vetoed).toBe(true);
    const topIds = result.filter((r) => r.rank === 1).map((r) => r.id);
    expect(topIds.sort()).toEqual(['A', 'B']);
  });

  it('vetoed entries still carry starScore from the inner ranker', () => {
    // B is vetoed (1 hard pass vs A's 0). B's starScore should be computed by
    // rankStar on the vetoed-only subset, not formatted by the veto decorator.
    const votes = [v({ A: 'excellent', B: 'good' }), v({ A: 'excellent', B: 'poor' })];
    const result = rankImplicitVetoStar([c('A'), c('B')], votes);
    const b = find(result, 'B');
    expect(b.vetoed).toBe(true);
    expect(typeof b.starScore).toBe('number');
  });
});
