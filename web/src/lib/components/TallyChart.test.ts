import type { Grade, RankedCandidate } from '@star-judge/shared';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TallyChart from './TallyChart.svelte';

const EMPTY_COUNTS: Record<Grade, number> = {
  excellent: 0,
  verygood: 0,
  good: 0,
  average: 0,
  fair: 0,
  poor: 0,
};

function mkCandidate(over: Partial<RankedCandidate> = {}): RankedCandidate {
  return {
    id: 'a',
    name: 'Wingspan',
    thumbnail: '',
    rank: 1,
    gradeCounts: { ...EMPTY_COUNTS, excellent: 3 },
    totalVotes: 3,
    ...over,
  };
}

describe('TallyChart', () => {
  it('renders empty state when no candidates', () => {
    render(TallyChart, { candidates: [], mode: 'mj' });
    expect(screen.getByText(/No votes yet/i)).toBeInTheDocument();
  });

  it('renders rank and name for each candidate', () => {
    render(TallyChart, {
      candidates: [
        mkCandidate({ id: 'a', name: 'Wingspan', rank: 1 }),
        mkCandidate({ id: 'b', name: 'Catan', rank: 2 }),
      ],
      mode: 'mj',
    });
    expect(screen.getByText('Wingspan')).toBeInTheDocument();
    expect(screen.getByText('Catan')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('shows veto badge with hard pass count for vetoed candidates', () => {
    render(TallyChart, {
      candidates: [
        mkCandidate({ id: 'a', vetoed: true, hardPassCount: 4 }),
      ],
      mode: 'mj',
    });
    expect(screen.getByText(/vetoed/i)).toBeInTheDocument();
    expect(screen.getByText(/4 HP/)).toBeInTheDocument();
  });

  it('hides vetoed candidates when showVetoed=false', () => {
    render(TallyChart, {
      candidates: [
        mkCandidate({ id: 'a', name: 'Wingspan' }),
        mkCandidate({ id: 'b', name: 'Catan', vetoed: true, hardPassCount: 2 }),
      ],
      mode: 'mj',
      showVetoed: false,
    });
    expect(screen.getByText('Wingspan')).toBeInTheDocument();
    expect(screen.queryByText('Catan')).not.toBeInTheDocument();
  });

  it('shows STAR score and runoff winner badge in star mode', () => {
    render(TallyChart, {
      candidates: [
        mkCandidate({ id: 'a', name: 'Wingspan', rank: 1, starScore: 12, totalVotes: 3, inRunoff: true }),
        mkCandidate({ id: 'b', name: 'Catan', rank: 2, starScore: 9, totalVotes: 3, inRunoff: true }),
      ],
      mode: 'star',
    });
    expect(screen.getByText('4.0')).toBeInTheDocument();
    expect(screen.getByText(/Runoff winner/i)).toBeInTheDocument();
    expect(screen.getByText(/Runoff finalist/i)).toBeInTheDocument();
  });

  it('shows Borda points in borda mode', () => {
    render(TallyChart, {
      candidates: [mkCandidate({ id: 'a', bordaScore: 7.5 })],
      mode: 'borda',
    });
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText(/pts/)).toBeInTheDocument();
  });

  it('shows IRV elim round for eliminated, survived tag for winner', () => {
    render(TallyChart, {
      candidates: [
        mkCandidate({ id: 'a', name: 'Wingspan', rank: 1 }),
        mkCandidate({ id: 'b', name: 'Catan', rank: 2, irvElimRound: 2 }),
      ],
      mode: 'irv',
    });
    expect(screen.getByText(/survived/i)).toBeInTheDocument();
    expect(screen.getByText(/elim\. round 2/i)).toBeInTheDocument();
  });

  it('shows cycle badge in condorcet mode when paradox and tied wins', () => {
    render(TallyChart, {
      candidates: [
        mkCandidate({ id: 'a', pairwiseWins: 1 }),
        mkCandidate({ id: 'b', pairwiseWins: 1 }),
        mkCandidate({ id: 'c', pairwiseWins: 1 }),
      ],
      mode: 'condorcet',
      condorcetParadox: true,
    });
    expect(screen.getAllByText(/cycle/i).length).toBeGreaterThan(0);
  });

  it("shows dictator's pick on rank 1 in dictator mode", () => {
    render(TallyChart, {
      candidates: [
        mkCandidate({ id: 'a', name: 'Wingspan', rank: 1 }),
        mkCandidate({ id: 'b', name: 'Catan', rank: 2 }),
      ],
      mode: 'dictator',
      dictatorName: 'Bob',
    });
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/pick/i)).toBeInTheDocument();
  });
});
