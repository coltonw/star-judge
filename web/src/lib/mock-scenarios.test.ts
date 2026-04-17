import { describe, expect, it } from 'vitest';
import { getMockScenario, MOCK_SCENARIOS } from './mock-scenarios';

const REQUIRED_ARRAY_FIELDS = ['mj', 'star', 'ivmj', 'ivstar', 'borda', 'irv', 'condorcet', 'dictator'] as const;
const REQUIRED_SCALAR_FIELDS = [
  'ballotId',
  'ballotName',
  'officialMethod',
  'voteCount',
  'condorcetParadox',
  'dictatorName',
] as const;

describe('MOCK_SCENARIOS', () => {
  it('all scenarios are present and findable by id', () => {
    expect(MOCK_SCENARIOS.length).toBeGreaterThan(0);
    for (const s of MOCK_SCENARIOS) {
      expect(getMockScenario(s.id)).toBe(s);
    }
  });

  it('getMockScenario returns undefined for unknown id', () => {
    expect(getMockScenario('does-not-exist')).toBeUndefined();
  });

  for (const s of MOCK_SCENARIOS) {
    describe(`scenario "${s.id}"`, () => {
      it('has all required scalar fields', () => {
        for (const field of REQUIRED_SCALAR_FIELDS) {
          expect(s.tally, `${field} missing in ${s.id}`).toHaveProperty(field);
          // condorcetParadox must be a boolean
          if (field === 'condorcetParadox') {
            expect(typeof s.tally.condorcetParadox, `condorcetParadox must be boolean in ${s.id}`).toBe('boolean');
          }
          // officialMethod must be a non-empty string
          if (field === 'officialMethod') {
            expect(s.tally.officialMethod, `officialMethod must be non-empty in ${s.id}`).toBeTruthy();
          }
        }
      });

      it('has all required ranking arrays', () => {
        for (const field of REQUIRED_ARRAY_FIELDS) {
          const arr = s.tally[field];
          expect(Array.isArray(arr), `${field} must be an array in ${s.id}`).toBe(true);
        }
      });

      it('every candidate in every ranking has required fields', () => {
        for (const field of REQUIRED_ARRAY_FIELDS) {
          for (const c of s.tally[field]) {
            expect(c.id, `id missing in ${s.id}.${field}`).toBeTruthy();
            expect(c.name, `name missing in ${s.id}.${field}`).toBeTruthy();
            expect(typeof c.rank, `rank must be number in ${s.id}.${field}`).toBe('number');
            expect(typeof c.totalVotes, `totalVotes must be number in ${s.id}.${field}`).toBe('number');
            expect(c.gradeCounts, `gradeCounts missing in ${s.id}.${field}`).toBeDefined();
            const grades = ['excellent', 'verygood', 'good', 'average', 'fair', 'poor'] as const;
            for (const g of grades) {
              expect(typeof c.gradeCounts[g], `gradeCounts.${g} must be number in ${s.id}.${field}`).toBe('number');
            }
          }
        }
      });

      it('all ranking arrays have same candidate count', () => {
        if (s.tally.voteCount === 0) return; // empty arrays are expected with no votes
        const counts = REQUIRED_ARRAY_FIELDS.map((f) => s.tally[f].length);
        const first = counts[0];
        for (let i = 1; i < counts.length; i++) {
          expect(
            counts[i],
            `${REQUIRED_ARRAY_FIELDS[i]} has ${counts[i]} candidates but mj has ${first} in ${s.id}`
          ).toBe(first);
        }
      });
    });
  }
});
