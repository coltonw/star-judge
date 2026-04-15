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
      const sessionId = getSessionId()
      const result = await checkVoted(ballot.id, sessionId)
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
  <h1 class="title">⚖️ Star Judge</h1>
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
    <p class="meta">{ballot.candidates.length} games · two voting methods compared</p>

    {#if hasVoted}
      <p class="voted-msg">You've already voted on this ballot.</p>
      <a href="/tally/{ballot.id}" class="btn btn-primary">See Current Results →</a>
    {:else}
      <a href="/vote/{ballot.id}" class="btn btn-primary">Cast Your Vote →</a>
      <a href="/tally/{ballot.id}" class="btn btn-ghost">Peek at Results</a>
    {/if}
  </div>
{/if}

<style>
  .hero {
    text-align: center;
    padding: 3rem 0 2rem;
  }

  .title {
    font-size: 3rem;
    margin-bottom: .5rem;
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
    gap: 1rem;
  }

  .meta {
    color: var(--text-muted);
    font-size: .9rem;
  }

  .voted-msg {
    color: var(--grade-excellent);
    font-size: .9rem;
  }

  .btn + .btn {
    align-self: flex-start;
  }
</style>
