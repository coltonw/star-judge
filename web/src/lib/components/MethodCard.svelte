<script lang="ts">
import type { RankedCandidate } from '@star-judge/shared';
import TallyChart from './TallyChart.svelte';

type Mode = 'star' | 'mj' | 'borda' | 'irv' | 'condorcet' | 'dictator';

interface Props {
  title: string;
  wikiUrl?: string;
  description: string;
  official: boolean;
  candidates: RankedCandidate[];
  mode: Mode;
  variant?: 'default' | 'iv' | 'dictator';
  // Render an empty-state note instead of the chart (e.g., "no games vetoed")
  emptyNote?: string;
  condorcetParadox?: boolean;
  dictatorName?: string | null;
}

const {
  title,
  wikiUrl,
  description,
  official,
  candidates,
  mode,
  variant = 'default',
  emptyNote,
  condorcetParadox = false,
  dictatorName = null,
}: Props = $props();
</script>

<section class="method-section card" class:iv-section={variant === 'iv'} class:dictator-section={variant === 'dictator'} class:official-section={official}>
  <div class="method-header">
    <h2>
      {#if wikiUrl}
        <a class="wiki-link" href={wikiUrl} target="_blank" rel="noopener">{title}</a>
      {:else}
        {title}
      {/if}
      {#if official}<span class="official-badge">official</span>{/if}
    </h2>
    <p class="method-desc">{description}</p>
  </div>

  {#if condorcetParadox}
    <div class="paradox-banner">
      🔄 <strong>Condorcet paradox!</strong> A beats B beats C beats A — no winner exists.
    </div>
  {/if}

  {#if variant === 'dictator'}
    {#if dictatorName}
      <p class="dictator-name">👑 Dictator: <strong>{dictatorName}</strong></p>
    {:else}
      <p class="no-veto-note">No votes yet.</p>
    {/if}
  {/if}

  {#if emptyNote}
    <p class="no-veto-note">{emptyNote}</p>
  {:else}
    <TallyChart {candidates} {mode} {condorcetParadox} {dictatorName} />
  {/if}
</section>

<style>
  .method-section {
    padding: 1.5rem;
  }
  .method-header {
    margin-bottom: 1.25rem;
  }
  .method-desc {
    font-size: 0.82rem;
    color: var(--text-muted);
    margin-top: 0.3rem;
    line-height: 1.5;
  }
  .iv-section {
    border-color: color-mix(in srgb, var(--danger) 30%, var(--border));
  }
  .dictator-section {
    border-color: color-mix(in srgb, var(--grade-excellent) 25%, var(--border));
  }
  .official-section {
    border-color: var(--teal) !important;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--teal) 25%, transparent);
  }
  .official-badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    background: color-mix(in srgb, var(--teal) 18%, var(--bg-card));
    color: var(--teal);
    vertical-align: middle;
    margin-left: 0.4rem;
  }
  .wiki-link {
    color: inherit;
    text-decoration: none;
  }
  .wiki-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: color-mix(in srgb, var(--text-muted) 60%, transparent);
  }
  .no-veto-note {
    color: var(--text-muted);
    font-size: 0.82rem;
    font-style: italic;
    padding: 1rem 0;
  }
  .paradox-banner {
    background: color-mix(in srgb, var(--accent-dim) 25%, var(--bg-card));
    border: 1px solid var(--accent-dim);
    border-radius: 6px;
    padding: 0.65rem 0.9rem;
    font-size: 0.85rem;
    color: var(--accent);
    margin-bottom: 1rem;
    line-height: 1.4;
  }
  .dictator-name {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }
  .dictator-name strong {
    color: var(--grade-excellent);
  }
</style>
