import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

vi.mock('$lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
    }
  },
  getBallots: vi.fn(),
  deleteBallot: vi.fn(),
  updateBallot: vi.fn(),
}));

const mockBallots = [
  {
    id: 1,
    name: 'April Game Night',
    candidates: [{ id: 'a', name: 'Wingspan', thumbnail: '' }],
    active: true,
    officialMethod: 'mj' as const,
    created_at: '2024-04-01',
  },
  {
    id: 2,
    name: 'March Game Night',
    candidates: [{ id: 'b', name: 'Catan', thumbnail: '' }],
    active: false,
    officialMethod: 'star' as const,
    created_at: '2024-03-01',
  },
];

describe('Admin page (admin/+page.svelte)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders ballot list after loading', async () => {
    const { getBallots } = await import('$lib/api');
    vi.mocked(getBallots).mockResolvedValue(mockBallots);

    render(Page);

    expect(screen.getByText('Loading…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });

    expect(screen.getByText('April Game Night')).toBeInTheDocument();
    expect(screen.getByText('March Game Night')).toBeInTheDocument();
  });

  it('shows active/closed badges', async () => {
    const { getBallots } = await import('$lib/api');
    vi.mocked(getBallots).mockResolvedValue(mockBallots);

    render(Page);

    await waitFor(() => screen.getByText('April Game Night'));

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('shows empty-state message when no ballots', async () => {
    const { getBallots } = await import('$lib/api');
    vi.mocked(getBallots).mockResolvedValue([]);

    render(Page);

    await waitFor(() => {
      expect(screen.getByText('No ballots yet. Create one above.')).toBeInTheDocument();
    });
  });

  it('shows "New Ballot" link', async () => {
    const { getBallots } = await import('$lib/api');
    vi.mocked(getBallots).mockResolvedValue([]);

    render(Page);

    await waitFor(() => screen.queryByText('Loading…') === null);

    expect(screen.getByRole('link', { name: '+ New Ballot' })).toBeInTheDocument();
  });

  it('exits loading even when API throws', async () => {
    const { getBallots } = await import('$lib/api');
    vi.mocked(getBallots).mockRejectedValue(new Error('Unauthorized'));

    render(Page);

    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });
  });
});
