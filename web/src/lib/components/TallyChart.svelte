<script lang="ts">
  import { GRADES, GRADE_LABELS, GRADE_COLORS, type RankedCandidate, type Grade } from '$lib/types'

  let {
    candidates,
    mode = 'mj',
  }: {
    candidates: RankedCandidate[]
    mode?: 'mj' | 'star'
  } = $props()

  function pct(candidate: RankedCandidate, grade: Grade): number {
    if (candidate.totalVotes === 0) return 0
    return (candidate.gradeCounts[grade] / candidate.totalVotes) * 100
  }

  function medianGrade(candidate: RankedCandidate): Grade {
    const total = candidate.totalVotes
    if (total === 0) return 'poor'
    let cumulative = 0
    for (const grade of GRADES) {
      cumulative += candidate.gradeCounts[grade]
      if (cumulative >= total / 2) return grade
    }
    return 'poor'
  }

  function avgScore(candidate: RankedCandidate): string {
    if (!candidate.starScore || candidate.totalVotes === 0) return '0.0'
    return (candidate.starScore / candidate.totalVotes).toFixed(1)
  }
</script>

{#if candidates.length === 0}
  <p class="empty">No votes yet — be the first!</p>
{:else}
  <div class="chart">
    {#each candidates as candidate, i (candidate.id)}
      {@const median = medianGrade(candidate)}
      <div class="row" style="animation-delay: {i * 40}ms">
        <div class="meta">
          <span class="rank">#{candidate.rank}</span>
          <span class="name">{candidate.name}</span>
          {#if mode === 'mj'}
            <span class="tag" style="color: {GRADE_COLORS[median]}">{GRADE_LABELS[median]}</span>
          {:else}
            <span class="tag star-score">
              {avgScore(candidate)}<span class="out-of">/5</span>
            </span>
            {#if candidate.inRunoff}
              <span class="runoff-badge" class:winner={candidate.rank === 1}>
                {candidate.rank === 1 ? '🏆 Runoff winner' : 'Runoff finalist'}
              </span>
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
