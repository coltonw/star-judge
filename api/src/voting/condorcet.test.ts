import { describe, expect, it } from 'vitest';
import { rankCondorcet } from './condorcet';
import { byRank, c, v, winner } from './test-helpers';

describe('rankCondorcet', () => {
  it('handles zero votes — no paradox', () => {
    const { ranked, hasParadox } = rankCondorcet([c('A'), c('B')], []);
    expect(ranked).toHaveLength(2);
    expect(hasParadox).toBe(false);
  });

  it('handles single candidate — no paradox', () => {
    const { ranked, hasParadox } = rankCondorcet([c('A')], [v({ A: 'excellent' })]);
    expect(ranked[0].rank).toBe(1);
    expect(hasParadox).toBe(false);
  });

  it('clear Condorcet winner beats everyone pairwise', () => {
    // A is preferred over B and C by a majority in each matchup
    const votes = [
      v({ A: 'excellent', B: 'good', C: 'verygood' }),
      v({ A: 'excellent', B: 'good', C: 'verygood' }),
      v({ A: 'excellent', B: 'good', C: 'verygood' }),
      v({ A: 'verygood', B: 'good', C: 'excellent' }),
    ];
    const { ranked, hasParadox } = rankCondorcet([c('A'), c('B'), c('C')], votes);
    expect(hasParadox).toBe(false);
    expect(winner(ranked)).toBe('A');
    const a = ranked.find((r) => r.id === 'A')!;
    expect(a.pairwiseWins).toBe(2); // beats both B and C
  });

  it('pairwiseWins counts correct matchup wins', () => {
    // 3 voters all prefer A > B > C
    const votes = [
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }),
    ];
    const { ranked } = rankCondorcet([c('A'), c('B'), c('C')], votes);
    const a = ranked.find((r) => r.id === 'A')!;
    const b = ranked.find((r) => r.id === 'B')!;
    const cc = ranked.find((r) => r.id === 'C')!;
    expect(a.pairwiseWins).toBe(2);
    expect(b.pairwiseWins).toBe(1);
    expect(cc.pairwiseWins).toBe(0);
    expect(byRank(ranked)).toEqual([['A'], ['B'], ['C']]);
  });

  it('Condorcet paradox: A > B > C > A cycle', () => {
    // 7 voters split into 3 groups with distinct grade distributions
    // Group 1 (3): A > B > C
    // Group 2 (2): B > C > A
    // Group 3 (2): C > A > B
    //
    // Pairwise: A vs B: group1(3)+group3(2)=5 for A, group2(2) for B → A beats B 5-2
    // Wait, let me think again:
    // A vs B: who prefers A over B?
    //   group1 (A=excellent, B=verygood): A > B ✓ (3 voters)
    //   group2 (B=excellent, C=verygood, A=good): B > A ✓ (2 voters for B)
    //   group3 (C=excellent, A=verygood, B=good): A > B ✓ (2 voters)
    // A beats B: 5-2
    //
    // B vs C:
    //   group1 (B=verygood, C=good): B > C (3 voters)
    //   group2 (B=excellent, C=verygood): B > C (2 voters)
    //   group3 (C=excellent, B=good): C > B (2 voters)
    // B beats C: 5-2
    //
    // C vs A:
    //   group1 (C=good, A=excellent): A > C... wait that means A beats C
    //   Hmm, this won't produce A>B>C>A.
    //
    // Classic cycle requires:
    // A beats B, B beats C, C beats A
    // Use the textbook construction:
    //   3 voters: A > B > C (A=exc, B=vgood, C=good)
    //   2 voters: B > C > A (B=exc, C=vgood, A=good)
    //   2 voters: C > A > B (C=exc, A=vgood, B=good)
    //
    // A vs B: group1(3 for A) + group3(2 for A) vs group2(2 for B) = 5 A, 2 B → A > B
    // B vs C: group1(3 for B) + group2(2 for B) vs group3(2 for C) = 5 B, 2 C → B > C
    // C vs A: group2(2 for C) + group3(2 for C) vs group1(3 for A) = 4 C, 3 A → C > A
    // Cycle: A > B > C > A ✓
    const votes = [
      v({ A: 'excellent', B: 'verygood', C: 'good' }),
      v({ A: 'excellent', B: 'verygood', C: 'good' }),
      v({ A: 'excellent', B: 'verygood', C: 'good' }),
      v({ A: 'good', B: 'excellent', C: 'verygood' }),
      v({ A: 'good', B: 'excellent', C: 'verygood' }),
      v({ A: 'verygood', B: 'good', C: 'excellent' }),
      v({ A: 'verygood', B: 'good', C: 'excellent' }),
    ];
    const { ranked, hasParadox } = rankCondorcet([c('A'), c('B'), c('C')], votes);
    expect(hasParadox).toBe(true);
    // All three candidates have 1 pairwise win each (cycle)
    expect(ranked.every((r) => r.pairwiseWins === 1)).toBe(true);
    // All share rank 1 when there's a cycle (Copeland scores tied)
    expect(ranked.every((r) => r.rank === 1)).toBe(true);
  });

  it('no paradox when there is a clear winner', () => {
    // Nashville scenario: A (Nashville) beats everyone
    const votes = [
      v({ A: 'excellent', B: 'fair', C: 'fair', D: 'poor' }),
      v({ A: 'excellent', B: 'fair', C: 'fair', D: 'poor' }),
      v({ A: 'excellent', B: 'fair', C: 'fair', D: 'poor' }),
      v({ A: 'verygood', B: 'good', C: 'fair', D: 'poor' }),
    ];
    const { hasParadox } = rankCondorcet([c('A'), c('B'), c('C'), c('D')], votes);
    expect(hasParadox).toBe(false);
  });

  it('exact pairwise tie counts as no win for either side', () => {
    // 2 voters, each prefers a different candidate
    const votes = [v({ A: 'excellent', B: 'poor' }), v({ A: 'poor', B: 'excellent' })];
    const { ranked } = rankCondorcet([c('A'), c('B')], votes);
    // Exact tie: neither wins the A vs B matchup
    expect(ranked.every((r) => r.pairwiseWins === 0)).toBe(true);
  });
});
