import { describe, expect, it } from 'vitest';
import { rankIrv } from './irv';
import { byRank, c, v, winner } from './test-helpers';

describe('rankIrv', () => {
  it('handles zero votes', () => {
    const result = rankIrv([c('A'), c('B')], []);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.totalVotes === 0)).toBe(true);
  });

  it('handles single candidate', () => {
    const result = rankIrv([c('A')], [v({ A: 'excellent' })]);
    expect(result[0].rank).toBe(1);
  });

  it('clear majority winner in first round', () => {
    // A gets 3 first-choice votes, B gets 1 → A has majority immediately
    const votes = [
      v({ A: 'excellent', B: 'poor' }),
      v({ A: 'excellent', B: 'poor' }),
      v({ A: 'excellent', B: 'poor' }),
      v({ A: 'poor', B: 'excellent' }),
    ];
    expect(winner(rankIrv([c('A'), c('B')], votes))).toBe('A');
  });

  it('basic 3-candidate elimination', () => {
    // Round 1: A=3, B=2, C=1 → C eliminated
    // Round 2: A=3, B=2+1=3... wait, C voters prefer B? Let's be explicit.
    // C's only voter rates B second → in round 2 that vote goes to B
    // Round 2: A=3, B=3 → tie, break to safety → both remain → both rank 1? No.
    // Let me use unambiguous numbers:
    // Round 1: A=3, B=2, C=0 → C has 0 (everyone rates C as poor/not voted)
    // C eliminated. Round 2: A still has 3, B still has 2 → A has majority (3>2.5).
    const votes = [
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'verygood', B: 'excellent', C: 'poor' }),
      v({ A: 'verygood', B: 'excellent', C: 'poor' }),
    ];
    expect(winner(rankIrv([c('A'), c('B'), c('C')], votes))).toBe('A');
    const result = rankIrv([c('A'), c('B'), c('C')], votes);
    expect(byRank(result)).toEqual([['A'], ['B'], ['C']]);
  });

  it('IRV runner-up gets rank 2, not rank 1 (majority winner bug)', () => {
    // 3 candidates: A, B, C
    // Round 1: A=3, B=2, C=0 → C eliminated (rated poor by everyone)
    // Round 2: A=3, B=2 → A has majority (3 > 5/2)
    // Bug: without fix, both A and B remain in `remaining` and get rank 1
    // Expected: A=rank 1, B=rank 2, C=rank 3
    const votes = [
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'verygood', B: 'excellent', C: 'poor' }),
      v({ A: 'verygood', B: 'excellent', C: 'poor' }),
    ];
    const result = rankIrv([c('A'), c('B'), c('C')], votes);

    const a = result.find((r) => r.id === 'A')!;
    const b = result.find((r) => r.id === 'B')!;
    const cc = result.find((r) => r.id === 'C')!;

    expect(a.rank).toBe(1);
    expect(b.rank).toBe(2); // FAILS without bug fix
    expect(cc.rank).toBe(3);

    // Only A should lack an elimRound (they're the winner)
    expect(a.irvElimRound).toBeUndefined();
    expect(b.irvElimRound).toBeDefined();
  });

  it('late-round elimination produces correct rank ordering', () => {
    // 4 candidates: A, B, C, D
    // D is eliminated round 1, C round 2, B loses final
    // Expected ranking: A(1), B(2), C(3), D(4)
    const votes = [
      v({ A: 'excellent', B: 'verygood', C: 'good', D: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'good', D: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'good', D: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'good', D: 'poor' }),
      v({ A: 'verygood', B: 'excellent', C: 'good', D: 'poor' }),
      v({ A: 'verygood', B: 'excellent', C: 'good', D: 'poor' }),
      v({ A: 'good', B: 'verygood', C: 'excellent', D: 'poor' }),
    ];
    const result = rankIrv([c('A'), c('B'), c('C'), c('D')], votes);
    // A should win: 4 first-choice votes → majority after D and C eliminated
    expect(winner(result)).toBe('A');
    const d = result.find((r) => r.id === 'D')!;
    expect(d.irvElimRound).toBe(1); // D eliminated first (always rated poor)
  });

  it('redistribution: eliminated candidate votes transfer to next choice', () => {
    // C gets 1 first-choice, all C voters prefer A second
    // Without redistribution: A=2, B=2, C=1 → C eliminated
    // With redistribution: A=3, B=2 → A wins
    const votes = [
      v({ A: 'excellent', B: 'good', C: 'poor' }),
      v({ A: 'excellent', B: 'good', C: 'poor' }),
      v({ A: 'verygood', B: 'good', C: 'excellent' }), // C first, then A
      v({ A: 'poor', B: 'excellent', C: 'good' }),
      v({ A: 'poor', B: 'excellent', C: 'good' }),
    ];
    expect(winner(rankIrv([c('A'), c('B'), c('C')], votes))).toBe('A');
  });

  it('all candidates rated equally — safety break, no one eliminated', () => {
    const votes = [v({ A: 'good', B: 'good' }), v({ A: 'good', B: 'good' })];
    // Both get 1 vote each (split). No majority. Both tie for last → safety break.
    const result = rankIrv([c('A'), c('B')], votes);
    // Both remain as winners (true tie)
    expect(result.filter((r) => r.rank === 1)).toHaveLength(2);
  });
});
