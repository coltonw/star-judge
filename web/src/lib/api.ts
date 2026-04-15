import type { Ballot, TallyResponse, Candidate, Grade } from './types'

// In production this will be empty (same origin via Cloudflare).
// Set VITE_API_BASE in .env.local for local dev: http://localhost:8787
const BASE = import.meta.env.VITE_API_BASE ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, (body as any).error ?? res.statusText)
  }
  return res.json()
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// --- Ballots ---

export function getActiveBallot(): Promise<Ballot> {
  return request('/api/ballots/active')
}

export function getBallot(id: number): Promise<Ballot> {
  return request(`/api/ballots/${id}`)
}

export function getBallots(): Promise<Ballot[]> {
  return request('/api/ballots')
}

export function createBallot(name: string, candidates: Candidate[]): Promise<Ballot> {
  return request('/api/admin/ballots', {
    method: 'POST',
    body: JSON.stringify({ name, candidates }),
  })
}

export function updateBallot(
  id: number,
  name: string,
  candidates: Candidate[],
  active: boolean
): Promise<Ballot> {
  return request(`/api/admin/ballots/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, candidates, active }),
  })
}

export function deleteBallot(id: number): Promise<void> {
  return request(`/api/admin/ballots/${id}`, { method: 'DELETE' })
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
  })
}

export interface ExistingVote {
  hasVoted: true
  voterName: string
  ratings: Record<string, string>
}

export function checkVoted(
  ballotId: number,
  sessionId: string
): Promise<{ hasVoted: false } | ExistingVote> {
  return request(`/api/votes/check?ballotId=${ballotId}&sessionId=${encodeURIComponent(sessionId)}`)
}

// --- Tally ---

export function getTally(ballotId: number): Promise<TallyResponse> {
  return request(`/api/tally/${ballotId}`)
}

// --- BGG ---

export function getBggCollection(
  username = 'dagreenmachine'
): Promise<{ candidates: Candidate[] } | { retry: true; message: string }> {
  return request(`/api/bgg/collection?username=${encodeURIComponent(username)}`)
}

// --- Session ID ---

export function getSessionId(): string {
  const key = 'star-judge-session'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}
