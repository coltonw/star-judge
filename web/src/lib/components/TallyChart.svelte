<script lang="ts">
import { GRADE_COLORS, GRADE_LABELS, GRADES, type Grade, type RankedCandidate } from '$lib/types';

let {
  candidates,
  mode = 'mj',
  showVetoed = true,
  condorcetParadox = false,
  dictatorName = null,
}: {
  candidates: RankedCandidate[];
  mode?: 'mj' | 'star' | 'borda' | 'irv' | 'condorcet' | 'dictator';
  showVetoed?: boolean;
  condorcetParadox?: boolean;
  dictatorName?: string | null;
} = $props();

let visibleCandidates = $derived(showVetoed ? candidates : candidates.filter((c) => !c.vetoed));
let totalCandidates = $derived(candidates.length);

function pct(candidate: RankedCandidate, grade: Grade): number {
  if (candidate.totalVotes === 0) return 0;
  return (candidate.gradeCounts[grade] / candidate.totalVotes) * 100;
}

function medianGrade(candidate: RankedCandidate): Grade {
  const total = candidate.totalVotes;
  if (total === 0) return 'poor';
  let cumulative = 0;
  for (const grade of GRADES) {
    cumulative += candidate.gradeCounts[grade];
    if (cumulative >= total / 2) return grade;
  }
  return 'poor';
}

function avgScore(candidate: RankedCandidate): string {
  if (!candidate.starScore || candidate.totalVotes === 0) return '0.0';
  return (candidate.starScore / candidate.totalVotes).toFixed(1);
}
</script>

{#if visibleCandidates.length === 0}
  <p class="empty">No votes yet — be the first!</p>
{:else}
  <div class="chart">
    {#each visibleCandidates as candidate, i (candidate.id)}
      {@const median = medianGrade(candidate)}
      <div class="row" class:vetoed-row={candidate.vetoed} style="animation-delay: {i * 40}ms">
        <div class="meta">
          <span class="rank">#{candidate.rank}</span>
          <span class="name">{candidate.name}</span>
          {#if candidate.vetoed}
            <span class="veto-badge">⊘ vetoed · {candidate.hardPassCount} HP</span>
          {:else if mode === 'mj'}
            <span class="tag" style="color: {GRADE_COLORS[median]}">{GRADE_LABELS[median]}</span>
          {:else if mode === 'star'}
            <span class="tag star-score">
              {avgScore(candidate)}<span class="out-of">/5</span>
            </span>
            {#if candidate.inRunoff}
              <span class="runoff-badge" class:winner={candidate.rank === 1}>
                {candidate.rank === 1 ? '🏆 Runoff winner' : 'Runoff finalist'}
              </span>
            {/if}
          {:else if mode === 'borda'}
            <span class="tag borda-score">
              {candidate.bordaScore?.toFixed(1)} <span class="out-of">pts</span>
            </span>
          {:else if mode === 'irv'}
            {#if candidate.irvElimRound !== undefined}
              <span class="elim-badge">elim. round {candidate.irvElimRound}</span>
            {:else}
              <span class="tag irv-winner">✓ survived</span>
            {/if}
          {:else if mode === 'condorcet'}
            {#if condorcetParadox && candidate.pairwiseWins === (totalCandidates - 1) / 2}
              <span class="paradox-badge">🔄 cycle</span>
            {:else}
              <span class="tag condorcet-score">
                {candidate.pairwiseWins}<span class="out-of">/{totalCandidates - 1} wins</span>
              </span>
            {/if}
          {:else if mode === 'dictator'}
            {#if candidate.rank === 1}
              <span class="tag dictator-pick">👑 {dictatorName ?? 'dictator'}'s pick</span>
            {/if}
          {/if}
        </div>
        <div class="bar-wrap">
          {#each GRADES as grade}
            {@const width = pct(candidate, grade)}
            {#if width > 0}
              <div
                class="segment"
                style="width: {width}%; background: {GRADE_COLORS[grade]};"
                title="{GRADE_LABELS[grade]}: {candidate.gradeCounts[grade]} vote{candidate.gradeCounts[grade] === 1 ? '' : 's'}"
              ></div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}

<div class="legend">
  {#each GRADES as grade}
    <span class="legend-item">
      <span class="swatch" style="background: {GRADE_COLORS[grade]}"></span>
      {GRADE_LABELS[grade]}
    </span>
  {/each}
</div>

<style>
  .chart {
    display: flex;
    flex-direction: column;
    gap: .75rem;
    margin-bottom: 1rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: .3rem .75rem;
    animation: fadeSlideIn 0.35s ease both;
  }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .meta {
    display: flex;
    align-items: baseline;
    gap: .4rem;
    min-width: 0;
    grid-column: 1 / -1;
  }

  .rank {
    font-size: .75rem;
    font-weight: 700;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .name {
    font-size: .9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .tag {
    font-size: .75rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .star-score {
    color: var(--teal);
  }

  .out-of {
    font-weight: 400;
    color: var(--text-muted);
    font-size: .7rem;
  }

  .runoff-badge {
    font-size: .68rem;
    font-weight: 600;
    padding: .1rem .4rem;
    border-radius: 3px;
    background: color-mix(in srgb, var(--teal-dim) 30%, var(--bg-card));
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .runoff-badge.winner {
    background: color-mix(in srgb, var(--teal) 15%, var(--bg-card));
    color: var(--teal);
  }

  .bar-wrap {
    display: flex;
    height: 28px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--bg-hover);
    grid-column: 1 / -1;
  }

  .segment {
    height: 100%;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 2px;
  }

  .borda-score { color: var(--accent); }

  .irv-winner { color: var(--teal); }

  .elim-badge {
    font-size: .68rem;
    font-weight: 600;
    padding: .1rem .4rem;
    border-radius: 3px;
    background: color-mix(in srgb, var(--text-muted) 15%, var(--bg-card));
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .condorcet-score { color: var(--accent); }

  .paradox-badge {
    font-size: .68rem;
    font-weight: 600;
    padding: .1rem .4rem;
    border-radius: 3px;
    background: color-mix(in srgb, var(--accent-dim) 30%, var(--bg-card));
    color: var(--accent);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .dictator-pick {
    font-size: .75rem;
    font-weight: 600;
    color: var(--grade-excellent);
  }

  .vetoed-row {
    opacity: 0.45;
  }

  .veto-badge {
    font-size: .68rem;
    font-weight: 600;
    padding: .1rem .4rem;
    border-radius: 3px;
    background: color-mix(in srgb, var(--danger) 18%, var(--bg-card));
    color: var(--danger);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .empty {
    color: var(--text-muted);
    text-align: center;
    padding: 2rem 0;
    margin-bottom: 1rem;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: .4rem .9rem;
    margin-top: .5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: .3rem;
    font-size: .72rem;
    color: var(--text-muted);
  }

  .swatch {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    flex-shrink: 0;
  }
</style>
