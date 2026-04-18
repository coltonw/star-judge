import { describe, expect, it } from 'vitest';
import { rankBorda } from './borda';
import { byRank, c, v, winner } from './test-helpers';

describe('rankBorda', () => {
  it('handles zero votes', () => {
    const result = rankBorda([c('A'), c('B')], []);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.totalVotes === 0)).toBe(true);
  });

  it('handles single candidate', () => {
    const result = rankBorda([c('A')], [v({ A: 'excellent' })]);
    expect(result[0].rank).toBe(1);
    expect(result[0].bordaScore).toBe(0); // 1 candidate → N-1 = 0 points
  });

  it('clear winner with 2 candidates', () => {
    // N=2: rank 1 earns 1 pt, rank 2 earns 0 pts
    const votes = [
      v({ A: 'excellent', B: 'poor' }),
      v({ A: 'excellent', B: 'poor' }),
      v({ A: 'excellent', B: 'poor' }),
    ];
    expect(winner(rankBorda([c('A'), c('B')], votes))).toBe('A');
    const result = rankBorda([c('A'), c('B')], votes);
    const a = result.find((r) => r.id === 'A')!;
    expect(a.bordaScore).toBe(3); // 3 votes × 1 pt
  });

  it('3 candidates — basic ranking', () => {
    // N=3: excellent=2pts, verygood=?, we use grade values not rank positions
    // Actually Borda here is based on grade ordering, not submitted ranks
    // poor=0pt slot (rank 3), verygood=middle, excellent=top
    // With 3 candidates: pos 0=top earns 2pts, pos 1=middle 1pt, pos 2=bottom 0pt
    const votes = [
      v({ A: 'excellent', B: 'verygood', C: 'poor' }), // A=2, B=1, C=0
      v({ A: 'excellent', B: 'verygood', C: 'poor' }), // A=2, B=1, C=0
    ];
    const result = rankBorda([c('A'), c('B'), c('C')], votes);
    expect(byRank(result)).toEqual([['A'], ['B'], ['C']]);
    const a = result.find((r) => r.id === 'A')!;
    expect(a.bordaScore).toBe(4); // 2 votes × 2 pts
  });

  it('fractional points when two candidates tied in grade', () => {
    // N=2: points to award are [1, 0]
    // voter ties A and B at excellent → both get (1+0)/2 = 0.5
    const votes = [
      v({ A: 'excellent', B: 'poor' }), // A=1, B=0
      v({ A: 'excellent', B: 'poor' }), // A=1, B=0
      v({ A: 'excellent', B: 'excellent' }), // A=0.5, B=0.5 (tied, split [1,0])
    ];
    const result = rankBorda([c('A'), c('B')], votes);
    const a = result.find((r) => r.id === 'A')!;
    const b = result.find((r) => r.id === 'B')!;
    expect(a.bordaScore).toBe(2.5); // 2×1 + 0.5
    expect(b.bordaScore).toBe(0.5); // 0×2 + 0.5
    expect(winner(result)).toBe('A');
  });

  it('all voters rate all candidates the same — equal borda scores', () => {
    const votes = [v({ A: 'good', B: 'good', C: 'good' })];
    const result = rankBorda([c('A'), c('B'), c('C')], votes);
    // All tied: each gets (2+1+0)/3 = 1 point
    expect(result.every((r) => r.rank === 1)).toBe(true);
    expect(result.every((r) => r.bordaScore === 1)).toBe(true);
  });

  it('shared rank for tied scores', () => {
    // A beats B and C; B and C tie
    const votes = [v({ A: 'excellent', B: 'good', C: 'good' }), v({ A: 'excellent', B: 'good', C: 'good' })];
    const result = rankBorda([c('A'), c('B'), c('C')], votes);
    expect(winner(result)).toBe('A');
    const b = result.find((r) => r.id === 'B')!;
    const cc = result.find((r) => r.id === 'C')!;
    expect(b.rank).toBe(cc.rank);
  });
});
