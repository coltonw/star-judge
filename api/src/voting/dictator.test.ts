import { describe, expect, it } from 'vitest';
import { rankDictator } from './dictator';
import { c, v, winner } from './test-helpers';

describe('rankDictator', () => {
  it('returns null dictatorName with zero votes', () => {
    const { ranked, dictatorName } = rankDictator([c('A'), c('B')], []);
    expect(dictatorName).toBeNull();
    expect(ranked).toHaveLength(2);
  });

  it('single vote — that voter is the dictator', () => {
    const { dictatorName } = rankDictator([c('A')], [v({ A: 'excellent' }, 'Alice')]);
    expect(dictatorName).toBe('Alice');
  });

  it('last voter is the dictator, not the first', () => {
    const votes = [
      v({ A: 'excellent', B: 'poor' }, 'Alice'), // prefers A
      v({ A: 'poor', B: 'excellent' }, 'Bob'), // prefers B — Bob votes last
    ];
    const { ranked, dictatorName } = rankDictator([c('A'), c('B')], votes);
    expect(dictatorName).toBe('Bob');
    expect(winner(ranked)).toBe('B'); // Bob's preference wins
  });

  it('dictator ranking overrides majority preference', () => {
    // 4 voters prefer A, but the last voter (dictator) prefers C
    const votes = [
      v({ A: 'excellent', B: 'verygood', C: 'poor' }, 'v1'),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }, 'v2'),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }, 'v3'),
      v({ A: 'excellent', B: 'verygood', C: 'poor' }, 'v4'),
      v({ A: 'poor', B: 'poor', C: 'excellent' }, 'Dictator'),
    ];
    const { ranked, dictatorName } = rankDictator([c('A'), c('B'), c('C')], votes);
    expect(dictatorName).toBe('Dictator');
    expect(winner(ranked)).toBe('C');
  });

  it('grade bars reflect all votes (not just dictator)', () => {
    // 3 voters, last is dictator who likes B
    const votes = [
      v({ A: 'excellent', B: 'poor' }, 'v1'),
      v({ A: 'excellent', B: 'poor' }, 'v2'),
      v({ A: 'poor', B: 'excellent' }, 'Dictator'),
    ];
    const { ranked } = rankDictator([c('A'), c('B')], votes);
    const a = ranked.find((r) => r.id === 'A')!;
    // gradeCounts should reflect ALL 3 votes
    expect(a.gradeCounts.excellent).toBe(2);
    expect(a.gradeCounts.poor).toBe(1);
    expect(a.totalVotes).toBe(3);
  });

  it('dictator ties produce shared rank', () => {
    // Dictator rates A and B equally
    const votes = [v({ A: 'excellent', B: 'excellent' }, 'Dictator')];
    const { ranked } = rankDictator([c('A'), c('B')], votes);
    expect(ranked[0].rank).toBe(ranked[1].rank);
  });
});
