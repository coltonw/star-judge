import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

const mockPageParams = { id: '5' };
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
  updateBallot: vi.fn(),
  getBggCollection: vi.fn(),
}));

const mockBallot = {
  id: 5,
  name: 'Existing Ballot',
  candidates: [
    { id: 'a', name: 'Wingspan', thumbnail: '' },
    { id: 'b', name: 'Catan', thumbnail: '' },
  ],
  active: true,
  officialMethod: 'mj' as const,
  created_at: '2024-01-15T00:00:00.000Z',
};

describe('Admin edit ballot page (admin/ballots/[id]/+page.svelte)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockPageParams.id = '5';
    const { getBggCollection } = await import('$lib/api');
    vi.mocked(getBggCollection).mockResolvedValue({ candidates: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders ballot form after loading — does not stay on "Loading…"', async () => {
    const { getBallot } = await import('$lib/api');
    vi.mocked(getBallot).mockResolvedValue(mockBallot);

    render(Page);

    expect(screen.getByText('Loading…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Edit Ballot')).toBeInTheDocument();
    expect(screen.getByLabelText('Ballot name')).toHaveValue('Existing Ballot');
  });

  it('renders official method selector with all methods', async () => {
    const { getBallot } = await import('$lib/api');
    vi.mocked(getBallot).mockResolvedValue(mockBallot);

    render(Page);

    await waitFor(() => screen.getByText('Edit Ballot'));

    const select = screen.getByLabelText('Official voting method');
    expect(select).toBeInTheDocument();
    // Should have all 8 voting methods as options
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(8);
  });

  it('shows active checkbox pre-filled from ballot', async () => {
    const { getBallot } = await import('$lib/api');
    vi.mocked(getBallot).mockResolvedValue(mockBallot);

    render(Page);

    await waitFor(() => screen.getByText('Edit Ballot'));

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('shows Save + Cancel + View Results actions', async () => {
    const { getBallot } = await import('$lib/api');
    vi.mocked(getBallot).mockResolvedValue(mockBallot);

    render(Page);

    await waitFor(() => screen.getByText('Edit Ballot'));

    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Results/i })).toBeInTheDocument();
  });

  it('exits loading even when API throws', async () => {
    const { getBallot } = await import('$lib/api');
    vi.mocked(getBallot).mockRejectedValue(new Error('Not found'));

    render(Page);

    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });
  });
});
