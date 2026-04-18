import type { RankedCandidate } from '@star-judge/shared';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import MethodCard from './MethodCard.svelte';

function mkCandidate(over: Partial<RankedCandidate> = {}): RankedCandidate {
  return {
    id: 'a',
    name: 'Wingspan',
    thumbnail: '',
    rank: 1,
    gradeCounts: { excellent: 3, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
    totalVotes: 3,
    ...over,
  };
}

describe('MethodCard', () => {
  it('renders title, description, and info link to /methods anchor', () => {
    render(MethodCard, {
      methodKey: 'mj',
      title: 'Majority Judgment',
      description: 'Median grade wins.',
      official: false,
      candidates: [mkCandidate()],
      mode: 'mj',
    });

    expect(screen.getByText('Majority Judgment')).toBeInTheDocument();
    expect(screen.getByText('Median grade wins.')).toBeInTheDocument();
    const info = screen.getByTitle('How Majority Judgment works');
    expect(info).toHaveAttribute('href', '/methods#mj');
  });

  it('wraps title in wiki link when wikiUrl is provided', () => {
    render(MethodCard, {
      methodKey: 'star',
      title: 'STAR Voting',
      wikiUrl: 'https://example.com/star',
      description: 'desc',
      official: false,
      candidates: [mkCandidate()],
      mode: 'star',
    });

    const wikiLink = screen.getByRole('link', { name: 'STAR Voting' });
    expect(wikiLink).toHaveAttribute('href', 'https://example.com/star');
    expect(wikiLink).toHaveAttribute('target', '_blank');
  });

  it('shows official badge only when official=true', () => {
    const { rerender } = render(MethodCard, {
      methodKey: 'mj',
      title: 'MJ',
      description: 'd',
      official: false,
      candidates: [mkCandidate()],
      mode: 'mj',
    });
    expect(screen.queryByText('official')).not.toBeInTheDocument();

    rerender({
      methodKey: 'mj',
      title: 'MJ',
      description: 'd',
      official: true,
      candidates: [mkCandidate()],
      mode: 'mj',
    });
    expect(screen.getByText('official')).toBeInTheDocument();
  });

  it('renders paradox banner when condorcetParadox=true', () => {
    render(MethodCard, {
      methodKey: 'condorcet',
      title: 'Condorcet',
      description: 'd',
      official: false,
      candidates: [mkCandidate()],
      mode: 'condorcet',
      condorcetParadox: true,
    });
    expect(screen.getByText(/Condorcet paradox/i)).toBeInTheDocument();
  });

  it('renders dictator name when variant=dictator and dictatorName provided', () => {
    render(MethodCard, {
      methodKey: 'dictator',
      title: 'Dictator',
      description: 'd',
      official: false,
      candidates: [mkCandidate()],
      mode: 'dictator',
      variant: 'dictator',
      dictatorName: 'Alice',
    });
    expect(screen.getByText(/Dictator:/)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders emptyNote instead of chart when provided', () => {
    render(MethodCard, {
      methodKey: 'ivmj',
      title: 'IV · MJ',
      description: 'd',
      official: false,
      candidates: [mkCandidate()],
      mode: 'mj',
      variant: 'iv',
      emptyNote: 'No games vetoed — same result as MJ.',
    });
    expect(screen.getByText('No games vetoed — same result as MJ.')).toBeInTheDocument();
    expect(screen.queryByText('Wingspan')).not.toBeInTheDocument();
  });
});
