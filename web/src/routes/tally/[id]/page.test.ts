import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

// page.params.id controls which scenario or real ballot loads
const mockPageParams = { id: 'mock-diverge' };
vi.mock('$app/state', () => ({
  page: {
    get params() {
      return mockPageParams;
    },
  },
}));

vi.mock('$lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
    }
  },
  getTally: vi.fn(),
  checkVoted: vi.fn(),
  getSessionId: vi.fn(() => 'test-session'),
}));

describe('Tally page (tally/[id]/+page.svelte)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders mock scenario without getting stuck on "Computing results…"', async () => {
    mockPageParams.id = 'mock-diverge';
    render(Page);

    // Should transition out of loading
    await waitFor(() => {
      expect(screen.queryByText('Computing results…')).not.toBeInTheDocument();
    });

    // Ballot name from the diverge scenario
    expect(screen.getByText('Game Night — Methods Compared')).toBeInTheDocument();
  });

  it('renders all mock scenarios without hanging', async () => {
    const { MOCK_SCENARIOS } = await import('$lib/mock-scenarios');
    for (const scenario of MOCK_SCENARIOS) {
      mockPageParams.id = scenario.id;
      const { unmount } = render(Page);
      await waitFor(() => {
        expect(screen.queryByText('Computing results…')).not.toBeInTheDocument();
      });
      unmount();
    }
  });

  it('shows "Unknown scenario" error for bad mock id', async () => {
    mockPageParams.id = 'mock-does-not-exist';
    render(Page);

    await waitFor(() => {
      expect(screen.queryByText('Computing results…')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Unknown scenario/i)).toBeInTheDocument();
  });

  it('fetches real tally when id is numeric', async () => {
    const { getTally, checkVoted } = await import('$lib/api');
    mockPageParams.id = '42';

    vi.mocked(getTally).mockResolvedValue({
      ballotId: 42,
      ballotName: 'Test Ballot',
      officialMethod: 'mj',
      voteCount: 3,
      mj: [
        {
          id: 'a',
          name: 'Wingspan',
          thumbnail: '',
          rank: 1,
          totalVotes: 3,
          gradeCounts: { excellent: 3, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
        },
      ],
      star: [
        {
          id: 'a',
          name: 'Wingspan',
          thumbnail: '',
          rank: 1,
          totalVotes: 3,
          starScore: 15,
          inRunoff: true,
          gradeCounts: { excellent: 3, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
        },
      ],
      ivmj: [
        {
          id: 'a',
          name: 'Wingspan',
          thumbnail: '',
          rank: 1,
          totalVotes: 3,
          gradeCounts: { excellent: 3, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
        },
      ],
      ivstar: [
        {
          id: 'a',
          name: 'Wingspan',
          thumbnail: '',
          rank: 1,
          totalVotes: 3,
          starScore: 15,
          inRunoff: true,
          gradeCounts: { excellent: 3, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
        },
      ],
      borda: [
        {
          id: 'a',
          name: 'Wingspan',
          thumbnail: '',
          rank: 1,
          totalVotes: 3,
          bordaScore: 0,
          gradeCounts: { excellent: 3, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
        },
      ],
      irv: [
        {
          id: 'a',
          name: 'Wingspan',
          thumbnail: '',
          rank: 1,
          totalVotes: 3,
          gradeCounts: { excellent: 3, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
        },
      ],
      condorcet: [
        {
          id: 'a',
          name: 'Wingspan',
          thumbnail: '',
          rank: 1,
          totalVotes: 3,
          pairwiseWins: 0,
          gradeCounts: { excellent: 3, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
        },
      ],
      condorcetParadox: false,
      dictator: [
        {
          id: 'a',
          name: 'Wingspan',
          thumbnail: '',
          rank: 1,
          totalVotes: 3,
          gradeCounts: { excellent: 3, verygood: 0, good: 0, average: 0, fair: 0, poor: 0 },
        },
      ],
      dictatorName: 'Alice',
    });
    vi.mocked(checkVoted).mockResolvedValue({ hasVoted: false as const });

    render(Page);

    await waitFor(() => {
      expect(screen.getByText('Test Ballot')).toBeInTheDocument();
    });
  });

  it('shows error when API fails for numeric id', async () => {
    const { getTally, checkVoted } = await import('$lib/api');
    mockPageParams.id = '99';
    vi.mocked(getTally).mockRejectedValue(new Error('Not found'));
    vi.mocked(checkVoted).mockResolvedValue({ hasVoted: false as const });

    render(Page);

    await waitFor(() => {
      expect(screen.queryByText('Computing results…')).not.toBeInTheDocument();
    });
  });
});
