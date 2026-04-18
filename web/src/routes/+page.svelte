<script lang="ts">
import type { Ballot } from '@star-judge/shared';
import { onMount } from 'svelte';
import { ApiError, checkVoted, getActiveBallot, getSessionId } from '$lib/api';
import { MOCK_SCENARIOS } from '$lib/mock-scenarios';

const isDev = import.meta.env.DEV;

let ballot = $state<Ballot | null>(null);
let hasVoted = $state(false);
let loading = $state(true);
let error = $state('');

onMount(async () => {
  try {
    ballot = await getActiveBallot();
    const result = await checkVoted(ballot.id, getSessionId());
    hasVoted = result.hasVoted;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      error = 'No active ballot right now. Check back on game night!';
    } else {
      error = 'Failed to load ballot.';
    }
  } finally {
    loading = false;
  }
});
</script>

<svelte:head>
  <title>Star Judge — Game Night Voting</title>
</svelte:head>

<div class="hero">
  <h1 class="title">
    <img src="/logo.png" alt="" class="hero-logo" />
    Star Judge
  </h1>
  <p class="subtitle">Decide what to play tonight — with math.</p>
</div>

{#if isDev}
  <div class="dev-panel">
    <h3 class="dev-heading">Dev Scenarios</h3>
    <div class="scenario-grid">
      {#each MOCK_SCENARIOS as scenario}
        <a href="/tally/{scenario.id}" class="scenario-card">
          <span class="scenario-label">{scenario.label}</span>
          <span class="scenario-desc">{scenario.description}</span>
        </a>
      {/each}
    </div>
  </div>
{/if}

{#if loading}
  <p class="loading">Loading…</p>
{:else if error}
  <div class="card no-ballot">
    <p>{error}</p>
  </div>
{:else if ballot}
  <div class="card ballot-card">
    <h2>{ballot.name}</h2>
    <p class="meta">{ballot.candidates.length} games · STAR + MJ voting</p>

    {#if hasVoted}
      <div class="action-row">
        <a href="/tally/{ballot.id}" class="btn btn-primary">See Results →</a>
        <a href="/vote/{ballot.id}" class="btn btn-ghost">Change Your Vote</a>
      </div>
      <p class="voted-hint">
        Your vote is counted. You can update it any time before the ballot
        closes.
      </p>
    {:else}
      <div class="action-row">
        <a href="/vote/{ballot.id}" class="btn btn-primary">Cast Your Vote →</a>
        <a href="/tally/{ballot.id}" class="btn btn-ghost">Peek at Results</a>
      </div>
    {/if}
  </div>
{/if}

<style>
  .hero {
    text-align: center;
    padding: 3rem 0 2rem;
  }

  .title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .hero-logo {
    width: 56px;
    height: auto;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 1.1rem;
  }

  .loading {
    text-align: center;
    color: var(--text-muted);
    padding: 2rem;
  }

  .no-ballot {
    text-align: center;
    color: var(--text-muted);
    max-width: 480px;
    margin: 0 auto;
  }

  .ballot-card {
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .meta {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .action-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .voted-hint {
    color: var(--text-muted);
    font-size: 0.82rem;
    line-height: 1.4;
  }

  .dev-panel {
    max-width: 640px;
    margin: 0 auto 2.5rem;
    padding: 1.25rem;
    border: 1px dashed var(--border);
    border-radius: 10px;
  }

  .dev-heading {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 1rem;
  }

  .scenario-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.6rem;
  }

  .scenario-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.7rem 0.9rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 7px;
    text-decoration: none;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .scenario-card:hover {
    border-color: var(--accent);
    background: var(--bg-hover);
    text-decoration: none;
  }

  .scenario-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
  }

  .scenario-desc {
    font-size: 0.72rem;
    color: var(--text-muted);
    line-height: 1.4;
  }
</style>
