import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

const mockPageParams = { id: '1' };
vi.mock('$app/state', () => ({
  page: {
    get params() {
      return mockPageParams;
    },
  },
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
    }
  },
  getBallot: vi.fn(),
  checkVoted: vi.fn(),
  castVote: vi.fn(),
  getSessionId: vi.fn(() => 'test-session'),
}));

const mockBallot = {
  id: 1,
  name: 'Game Night Vote',
  candidates: [
    { id: 'a', name: 'Wingspan', thumbnail: '' },
    { id: 'b', name: 'Catan', thumbnail: '' },
  ],
  active: true,
  officialMethod: 'mj' as const,
  created_at: '2024-01-01',
};

describe('Vote page (vote/[id]/+page.svelte)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPageParams.id = '1';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders ballot form after loading — does NOT stay on "Loading ballot…"', async () => {
    const { getBallot, checkVoted } = await import('$lib/api');
    vi.mocked(getBallot).mockResolvedValue(mockBallot);
    vi.mocked(checkVoted).mockResolvedValue({ hasVoted: false as const });

    render(Page);

    expect(screen.getByText('Loading ballot…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading ballot…')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Game Night Vote')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
  });

  it('renders all grade buttons for each candidate', async () => {
    const { getBallot, checkVoted } = await import('$lib/api');
    vi.mocked(getBallot).mockResolvedValue(mockBallot);
    vi.mocked(checkVoted).mockResolvedValue({ hasVoted: false as const });

    render(Page);

    await waitFor(() => screen.getByText('Game Night Vote'));

    expect(screen.getByText('Wingspan')).toBeInTheDocument();
    expect(screen.getByText('Catan')).toBeInTheDocument();
    // 6 grades × 2 candidates = 12 radio buttons
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(12);
  });

  it('shows "Update Vote" UI when voter already voted', async () => {
    const { getBallot, checkVoted } = await import('$lib/api');
    vi.mocked(getBallot).mockResolvedValue(mockBallot);
    vi.mocked(checkVoted).mockResolvedValue({
      hasVoted: true,
      voterName: 'Bob',
      ratings: { a: 'excellent', b: 'good' },
    });

    render(Page);

    await waitFor(() => {
      expect(screen.getByText(/previous ratings are pre-filled/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Update Vote/i })).toBeInTheDocument();
  });

  it('shows closed ballot error instead of hanging', async () => {
    const { getBallot, checkVoted } = await import('$lib/api');
    vi.mocked(getBallot).mockResolvedValue({ ...mockBallot, active: false });
    vi.mocked(checkVoted).mockResolvedValue({ hasVoted: false as const });

    render(Page);

    await waitFor(() => {
      expect(screen.getByText('This ballot is closed.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Loading ballot…')).not.toBeInTheDocument();
  });

  it('exits loading even when API throws', async () => {
    const { getBallot } = await import('$lib/api');
    vi.mocked(getBallot).mockRejectedValue(new Error('Network error'));

    render(Page);

    await waitFor(() => {
      expect(screen.queryByText('Loading ballot…')).not.toBeInTheDocument();
    });
  });
});
