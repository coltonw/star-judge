import type { Candidate, Grade, Vote } from '../db/types';

let _seq = 0;

export function c(id: string, name?: string): Candidate {
  return { id, name: name ?? id, thumbnail: '' };
}

export function v(ratings: Record<string, Grade>, voterName = 'voter'): Vote {
  _seq++;
  return {
    id: _seq,
    ballot_id: 1,
    voter_name: voterName,
    session_id: `session-${_seq}`,
    ratings,
    created_at: '',
  };
}

/** Return candidates sorted by rank ascending (ties share the same rank). */
export function byRank(results: { rank: number; id: string }[]): string[][] {
  const groups = new Map<number, string[]>();
  for (const r of results) {
    if (!groups.has(r.rank)) groups.set(r.rank, []);
    groups.get(r.rank)!.push(r.id);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, ids]) => ids.sort());
}

/** Get the id of the unique rank-1 candidate (throws if tied). */
export function winner(results: { rank: number; id: string }[]): string {
  const top = results.filter((r) => r.rank === 1);
  if (top.length !== 1) throw new Error(`Expected 1 winner, got ${top.length}: ${top.map((r) => r.id).join(', ')}`);
  return top[0].id;
}
