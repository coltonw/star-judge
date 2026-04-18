import type { RankedCandidate, TallyResponse, VotingMethodKey } from '@star-judge/shared';

export interface MethodSummary {
  key: VotingMethodKey;
  label: string;
  winner: string;
}

export function firstNonVetoed(arr: RankedCandidate[] | undefined): string | null {
  return arr?.find((c) => !c.vetoed)?.name ?? null;
}

function isTied(arr: RankedCandidate[] | undefined): boolean {
  const survivors = arr?.filter((c) => !c.vetoed) ?? [];
  return survivors.length > 1 && survivors[0].rank === survivors[1].rank;
}

function tiedNames(arr: RankedCandidate[] | undefined): string[] {
  const survivors = arr?.filter((c) => !c.vetoed) ?? [];
  if (!isTied(arr)) return [];
  return survivors.filter((c) => c.rank === survivors[0].rank).map((c) => c.name);
}

export function winnerLabel(arr: RankedCandidate[] | undefined, paradox = false): string {
  if (paradox) return '🔄 Cycle';
  if (isTied(arr)) return `${tiedNames(arr).join(' & ')} (tie)`;
  return firstNonVetoed(arr) ?? '—';
}

// Build one MethodSummary per method, reordered so the officialMethod appears first.
export function summarizeMethods(tally: TallyResponse): MethodSummary[] {
  const entries: MethodSummary[] = [
    { key: 'star', label: 'STAR', winner: winnerLabel(tally.star) },
    { key: 'ivstar', label: 'IV·STAR', winner: winnerLabel(tally.ivstar) },
    { key: 'mj', label: 'MJ', winner: winnerLabel(tally.mj) },
    { key: 'ivmj', label: 'IV·MJ', winner: winnerLabel(tally.ivmj) },
    { key: 'borda', label: 'Borda', winner: winnerLabel(tally.borda) },
    { key: 'irv', label: 'IRV', winner: winnerLabel(tally.irv) },
    { key: 'condorcet', label: 'Condorcet', winner: winnerLabel(tally.condorcet, tally.condorcetParadox) },
    {
      key: 'dictator',
      label: 'Dictator',
      winner: tally.dictatorName ? winnerLabel(tally.dictator) : '—',
    },
  ];
  const official = tally.officialMethod ?? 'mj';
  return entries.sort((a, b) => (b.key === official ? 1 : 0) - (a.key === official ? 1 : 0));
}

// Returns null when methods disagree. Otherwise returns the single winner string
// (may include " (tie)" if methods agree on a tied set). Condorcet is excluded
// when a paradox exists; Dictator is excluded when no voter has cast a vote.
export function computeConsensus(tally: TallyResponse, methods: MethodSummary[]): string | null {
  if (tally.voteCount === 0) return null;
  const applicable = methods.filter((m) => (m.key !== 'condorcet' || !tally.condorcetParadox) && m.winner !== '—');
  if (applicable.length === 0) return null;
  const unique = new Set(applicable.map((m) => m.winner));
  return unique.size === 1 ? [...unique][0] : null;
}

// If the consensus is a tie, deterministically pick one of the tied names.
// Seeded by (ballotId, voteCount) so the pick is stable across refreshes for
// the same tally state but varies per ballot.
export function pickTiebreaker(tally: TallyResponse, consensus: string | null): string | null {
  if (!consensus?.includes('(tie)')) return null;
  const names = consensus.replace(' (tie)', '').split(' & ');
  const seed = (tally.ballotId ?? 0) * 997 + (tally.voteCount ?? 0);
  return names[seed % names.length];
}
