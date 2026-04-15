<script lang="ts">
  import { GRADES, GRADE_LABELS, GRADE_COLORS, type RankedCandidate, type Grade } from '$lib/types'

  let { candidates }: { candidates: RankedCandidate[] } = $props()

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
</script>

<div class="chart">
  {#each candidates as candidate, i (candidate.id)}
    {@const median = medianGrade(candidate)}
    <div class="row" style="animation-delay: {i * 40}ms">
      <div class="meta">
        <span class="rank">#{candidate.rank}</span>
        <span class="name">{candidate.name}</span>
        <span class="median" style="color: {GRADE_COLORS[median]}">{GRADE_LABELS[median]}</span>
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

{#if candidates.length === 0}
  <p class="empty">No votes yet — be the first!</p>
{/if}

<!-- Legend -->
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
    grid-template-columns: 260px 1fr;
    align-items: center;
    gap: 1rem;
    animation: fadeSlideIn 0.35s ease both;
  }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .meta {
    display: flex;
    align-items: baseline;
    gap: .5rem;
    overflow: hidden;
  }

  .rank {
    font-size: .75rem;
    font-weight: 700;
    color: var(--text-muted);
    min-width: 2rem;
  }

  .name {
    font-size: .9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .median {
    font-size: .75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .bar-wrap {
    display: flex;
    height: 28px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--bg-hover);
  }

  .segment {
    height: 100%;
    /* Animate width changes when tally polls update */
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 2px;
  }

  .empty {
    color: var(--text-muted);
    text-align: center;
    padding: 2rem 0;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: .5rem 1rem;
    margin-top: .75rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: .3rem;
    font-size: .75rem;
    color: var(--text-muted);
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }
</style>
