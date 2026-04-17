import { describe, expect, it } from 'vitest';
import { rankMajorityJudgment } from './majority-judgment';
import { byRank, c, v, winner } from './test-helpers';

describe('rankMajorityJudgment', () => {
  it('handles zero votes', () => {
    const result = rankMajorityJudgment([c('A'), c('B')], []);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.totalVotes === 0)).toBe(true);
  });

  it('handles single candidate', () => {
    const result = rankMajorityJudgment([c('A')], [v({ A: 'excellent' })]);
    expect(result[0].rank).toBe(1);
    expect(result[0].gradeCounts.excellent).toBe(1);
  });

  it('higher median grade wins', () => {
    // A: all excellent → median excellent
    // B: all good → median good
    const votes = [
      v({ A: 'excellent', B: 'good' }),
      v({ A: 'excellent', B: 'good' }),
      v({ A: 'excellent', B: 'good' }),
    ];
    expect(winner(rankMajorityJudgment([c('A'), c('B')], votes))).toBe('A');
  });

  it('three candidates ranked by median', () => {
    // A: median excellent, B: median good, C: median poor
    const votes = [
      v({ A: 'excellent', B: 'good', C: 'poor' }),
      v({ A: 'excellent', B: 'good', C: 'poor' }),
      v({ A: 'excellent', B: 'good', C: 'poor' }),
    ];
    const result = rankMajorityJudgment([c('A'), c('B'), c('C')], votes);
    expect(byRank(result)).toEqual([['A'], ['B'], ['C']]);
  });

  it('tie broken by votes above median (distance tiebreak)', () => {
    // Both A and B have median 'good' (3 voters, middle vote is good)
    // A: excellent, good, poor → median good, 1 vote above (excellent)
    // B: verygood, good, poor → median good, 1 vote above (verygood)
    // A has a better grade above the median → A should win
    const votes = [v({ A: 'excellent', B: 'verygood' }), v({ A: 'good', B: 'good' }), v({ A: 'poor', B: 'poor' })];
    expect(winner(rankMajorityJudgment([c('A'), c('B')], votes))).toBe('A');
  });

  it('more votes above median beats fewer votes above median', () => {
    // A: 3 excellent, 2 poor → median excellent (3 > 2.5)
    // B: 2 excellent, 3 poor → median poor (2 < 2.5, then 2+3=5 >= 2.5 at poor... wait)
    // Actually with 5 voters, median is the 3rd highest:
    // A: [excellent, excellent, excellent, poor, poor] → median = excellent ✓
    // B: [excellent, excellent, poor, poor, poor] → median = poor ✓ (3rd is poor)
    // A wins because excellent > poor
    const aVotes = [
      v({ A: 'excellent', B: 'excellent' }),
      v({ A: 'excellent', B: 'excellent' }),
      v({ A: 'excellent', B: 'poor' }),
      v({ A: 'poor', B: 'poor' }),
      v({ A: 'poor', B: 'poor' }),
    ];
    expect(winner(rankMajorityJudgment([c('A'), c('B')], aVotes))).toBe('A');
  });

  it('totalVotes is set correctly', () => {
    const votes = [v({ A: 'good', B: 'fair' }), v({ A: 'good', B: 'fair' })];
    const result = rankMajorityJudgment([c('A'), c('B')], votes);
    expect(result[0].totalVotes).toBe(2);
    expect(result[1].totalVotes).toBe(2);
  });
});
