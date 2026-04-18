import type { Ballot, Candidate, Grade, TallyResponse, VotingMethodKey } from '@star-judge/shared';

// In production this will be empty (same origin via Cloudflare).
// Set VITE_API_BASE in .env.local for local dev: http://localhost:8787
const BASE = import.meta.env.VITE_API_BASE ?? '';

// Thrown for any non-2xx response, or for network/parse failures. Callers can
// distinguish with `error.kind`: 'network' (never reached the server), 'client'
// (4xx — input problem), 'server' (5xx — server bug), or 'parse' (malformed
// response). `status` is 0 for network/parse failures.
export type ApiErrorKind = 'network' | 'client' | 'server' | 'parse';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly body: unknown;

  constructor(kind: ApiErrorKind, status: number, message: string, body?: unknown) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.body = body;
  }

  get isRetryable(): boolean {
    return this.kind === 'network' || (this.kind === 'server' && this.status !== 501);
  }
}

function classify(status: number): ApiErrorKind {
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';
  return 'server';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch (e) {
    // TypeError from fetch means DNS / offline / CORS / aborted.
    throw new ApiError('network', 0, e instanceof Error ? e.message : 'Network request failed');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? res.statusText ?? `HTTP ${res.status}`;
    throw new ApiError(classify(res.status), res.status, message, body);
  }

  try {
    return (await res.json()) as T;
  } catch (e) {
    throw new ApiError('parse', res.status, e instanceof Error ? e.message : 'Invalid JSON response');
  }
}

// --- Ballots ---

export function getActiveBallot(): Promise<Ballot> {
  return request('/api/ballots/active');
}

export function getBallot(id: number): Promise<Ballot> {
  return request(`/api/ballots/${id}`);
}

export function getBallots(): Promise<Ballot[]> {
  return request('/api/ballots');
}

export function createBallot(
  name: string,
  candidates: Candidate[],
  officialMethod: VotingMethodKey = 'ivstar'
): Promise<Ballot> {
  return request('/api/admin/ballots', {
    method: 'POST',
    body: JSON.stringify({ name, candidates, officialMethod }),
  });
}

export function updateBallot(
  id: number,
  name: string,
  candidates: Candidate[],
  active: boolean,
  officialMethod: VotingMethodKey = 'ivstar'
): Promise<Ballot> {
  return request(`/api/admin/ballots/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, candidates, active, officialMethod }),
  });
}

export function deleteBallot(id: number): Promise<void> {
  return request(`/api/admin/ballots/${id}`, { method: 'DELETE' });
}

// --- Votes ---

export function castVote(
  ballotId: number,
  voterName: string,
  sessionId: string,
  ratings: Record<string, Grade>
): Promise<unknown> {
  return request('/api/votes', {
    method: 'POST',
    body: JSON.stringify({ ballotId, voterName, sessionId, ratings }),
  });
}

export interface ExistingVote {
  hasVoted: true;
  voterName: string;
  ratings: Record<string, string>;
}

export function checkVoted(ballotId: number, sessionId: string): Promise<{ hasVoted: false } | ExistingVote> {
  return request(`/api/votes/check?ballotId=${ballotId}&sessionId=${encodeURIComponent(sessionId)}`);
}

// --- Tally ---

export function getTally(ballotId: number): Promise<TallyResponse> {
  return request(`/api/tally/${ballotId}`);
}

// --- BGG ---

export function getBggCollection(
  username = 'dagreenmachine'
): Promise<{ candidates: Candidate[] } | { retry: true; message: string }> {
  return request(`/api/bgg/collection?username=${encodeURIComponent(username)}`);
}

// --- Session ID ---

export function getSessionId(): string {
  const key = 'star-judge-session';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
