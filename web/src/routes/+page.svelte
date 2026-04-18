<script lang="ts">
import type { Ballot } from '@star-judge/shared';
import { onMount } from 'svelte';
import { ApiError, checkVoted, getActiveBallot, getSessionId } from '$lib/api';
import { ADMIN_MOCK_SCENARIOS, MOCK_SCENARIOS } from '$lib/mock-scenarios';
import type { LayoutData } from './$types';

let { data }: { data: LayoutData } = $props();

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

<section class="explore">
  <div class="explore-head">
    <h2>Explore the voting methods</h2>
    <p>
      Every ballot runs through <a href="/methods">eight voting methods</a> at once. These hand-crafted scenarios show where they disagree, when vetos matter, and what happens in rock-paper-scissors cycles.
    </p>
  </div>
  <div class="scenario-grid">
    {#each MOCK_SCENARIOS as scenario}
      <a href="/tally/{scenario.id}" class="scenario-card">
        <span class="scenario-label">{scenario.label}</span>
        <span class="scenario-desc">{scenario.description}</span>
      </a>
    {/each}
  </div>

  {#if data.isAdmin}
    <div class="admin-fixtures">
      <h3>Admin test fixtures</h3>
      <p class="admin-hint">Empty/degenerate states for QA — not part of the public demo set.</p>
      <div class="scenario-grid">
        {#each ADMIN_MOCK_SCENARIOS as scenario}
          <a href="/tally/{scenario.id}" class="scenario-card scenario-card-admin">
            <span class="scenario-label">{scenario.label}</span>
            <span class="scenario-desc">{scenario.description}</span>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</section>

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

  .explore {
    max-width: 720px;
    margin: 3rem auto 2rem;
  }

  .explore-head {
    margin-bottom: 1.25rem;
  }

  .explore-head h2 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .explore-head p {
    color: var(--text-muted);
    line-height: 1.55;
    font-size: 0.92rem;
  }

  .explore-head a {
    color: var(--accent);
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

  .admin-fixtures {
    margin-top: 2rem;
    padding-top: 1.25rem;
    border-top: 1px dashed var(--border);
  }

  .admin-fixtures h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .admin-hint {
    color: var(--text-muted);
    font-size: 0.78rem;
    margin-bottom: 0.9rem;
  }

  .scenario-card-admin {
    opacity: 0.75;
  }

  .scenario-card-admin:hover {
    opacity: 1;
  }
</style>
