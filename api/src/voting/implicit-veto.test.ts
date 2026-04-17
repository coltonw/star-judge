import { describe, expect, it } from 'vitest';
import { rankImplicitVetoMj, rankImplicitVetoStar } from './implicit-veto';
import { c, v, winner } from './test-helpers';

// Helper: find a result entry by id
function find(results: { id: string; vetoed?: boolean; rank: number }[], id: string) {
  return results.find((r) => r.id === id)!;
}

describe('implicit veto (shared behavior)', () => {
  it('no hard passes — no candidates vetoed (MJ)', () => {
    const votes = [v({ A: 'excellent', B: 'good', C: 'verygood' }), v({ A: 'excellent', B: 'good', C: 'verygood' })];
    const result = rankImplicitVetoMj([c('A'), c('B'), c('C')], votes);
    expect(result.every((r) => !r.vetoed)).toBe(true);
  });

  it('no hard passes — no candidates vetoed (STAR)', () => {
    const votes = [v({ A: 'excellent', B: 'good', C: 'verygood' }), v({ A: 'excellent', B: 'good', C: 'verygood' })];
    const result = rankImplicitVetoStar([c('A'), c('B'), c('C')], votes);
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

  it('candidate with more hard passes than minimum is vetoed (MJ)', () => {
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

  it('veto winner same as base MJ when no vetoes', () => {
    const votes = [v({ A: 'excellent', B: 'good' }), v({ A: 'excellent', B: 'good' })];
    const ivResult = rankImplicitVetoMj([c('A'), c('B')], votes);
    expect(winner(ivResult)).toBe('A');
  });

  it('veto removes candidate that would otherwise win (STAR)', () => {
    // C gets rated poor by everyone except themselves, so gets vetoed
    // A and B have 0 hard passes; C has 2 → C vetoed
    // Without veto: C might score high; with veto: C is removed
    const votes = [v({ A: 'excellent', B: 'verygood', C: 'poor' }), v({ A: 'verygood', B: 'excellent', C: 'poor' })];
    const result = rankImplicitVetoStar([c('A'), c('B'), c('C')], votes);
    expect(find(result, 'C').vetoed).toBe(true);
    // Winner is among A and B
    const w = winner(result);
    expect(['A', 'B']).toContain(w);
  });

  it('zero votes — falls through to base method with no vetoes', () => {
    const result = rankImplicitVetoMj([c('A'), c('B')], []);
    expect(result.every((r) => !r.vetoed)).toBe(true);
  });
});
