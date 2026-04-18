import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

vi.mock('$lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public kind: 'network' | 'client' | 'server' | 'parse',
      public status: number,
      message: string,
      public body?: unknown
    ) {
      super(message);
    }
  },
  getActiveBallot: vi.fn(),
  checkVoted: vi.fn(),
  getSessionId: vi.fn(() => 'test-session'),
}));

const { getActiveBallot, checkVoted } = await import('$lib/api');

describe('Home page (+page.svelte)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows active ballot and vote link after loading', async () => {
    vi.mocked(getActiveBallot).mockResolvedValue({
      id: 1,
      name: 'Game Night',
      candidates: [
        { id: 'a', name: 'Wingspan', thumbnail: '' },
        { id: 'b', name: 'Catan', thumbnail: '' },
      ],
      active: true,
      officialMethod: 'mj',
      created_at: '2024-01-01',
    });
    vi.mocked(checkVoted).mockResolvedValue({ hasVoted: false as const });

    render(Page, { props: { data: { isAdmin: false } } });

    // Initially shows loading
    expect(screen.getByText('Loading…')).toBeInTheDocument();

    // After API resolves, ballot renders
    await waitFor(() => {
      expect(screen.getByText('Game Night')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Cast Your Vote/i })).toBeInTheDocument();
  });

  it('shows "already voted" state when voter has voted', async () => {
    vi.mocked(getActiveBallot).mockResolvedValue({
      id: 2,
      name: 'Friday Night',
      candidates: [{ id: 'a', name: 'Pandemic', thumbnail: '' }],
      active: true,
      officialMethod: 'mj',
      created_at: '2024-01-01',
    });
    vi.mocked(checkVoted).mockResolvedValue({ hasVoted: true, voterName: 'Alice', ratings: {} });

    render(Page, { props: { data: { isAdmin: false } } });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /See Results/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Change Your Vote/i })).toBeInTheDocument();
  });

  it('shows error message when no active ballot (404)', async () => {
    const { ApiError } = await import('$lib/api');
    vi.mocked(getActiveBallot).mockRejectedValue(new ApiError('client', 404, 'Not found'));

    render(Page, { props: { data: { isAdmin: false } } });

    await waitFor(() => {
      expect(screen.getByText(/No active ballot right now/i)).toBeInTheDocument();
    });
  });

  it('exits loading state even when API fails', async () => {
    vi.mocked(getActiveBallot).mockRejectedValue(new Error('Network error'));

    render(Page, { props: { data: { isAdmin: false } } });

    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });
  });
});
