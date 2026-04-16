<script lang="ts">
  import { onMount } from 'svelte'
  import { getActiveBallot, getSessionId, checkVoted, ApiError } from '$lib/api'
  import type { Ballot } from '$lib/types'

  let ballot = $state<Ballot | null>(null)
  let hasVoted = $state(false)
  let loading = $state(true)
  let error = $state('')

  onMount(async () => {
    try {
      ballot = await getActiveBallot()
      const result = await checkVoted(ballot.id, getSessionId())
      hasVoted = result.hasVoted
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        error = 'No active ballot right now. Check back on game night!'
      } else {
        error = 'Failed to load ballot.'
      }
    } finally {
      loading = false
    }
  })
</script>

<svelte:head>
  <title>Star Judge — Game Night Voting</title>
</svelte:head>

<div class="hero">
  <h1 class="title">
    <img src="/logo.svg" alt="" class="hero-logo" />
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
    <p class="meta">{ballot.candidates.length} games · MJ + STAR voting</p>

    {#if hasVoted}
      <div class="action-row">
        <a href="/tally/{ballot.id}" class="btn btn-primary">See Results →</a>
        <a href="/vote/{ballot.id}" class="btn btn-ghost">Change Your Vote</a>
      </div>
      <p class="voted-hint">Your vote is counted. You can update it any time before the ballot closes.</p>
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
    gap: .6rem;
    font-size: 3rem;
    margin-bottom: .5rem;
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
    gap: .9rem;
  }

  .meta {
    color: var(--text-muted);
    font-size: .9rem;
  }

  .action-row {
    display: flex;
    gap: .75rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .voted-hint {
    color: var(--text-muted);
    font-size: .82rem;
    line-height: 1.4;
  }
</style>
