<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import { getTally, checkVoted, getSessionId, ApiError } from '$lib/api'
  import TallyChart from '$lib/components/TallyChart.svelte'
  import type { TallyResponse } from '$lib/types'

  const ballotId = $derived(parseInt(page.params.id, 10))

  let tally = $state<TallyResponse | null>(null)
  let hasVoted = $state(false)
  let loading = $state(true)
  let error = $state('')
  let lastUpdated = $state<Date | null>(null)

  async function fetchTally() {
    try {
      tally = await getTally(ballotId)
      lastUpdated = new Date()
    } catch (e) {
      if (!tally) {
        error = e instanceof ApiError ? e.message : 'Failed to load results.'
      }
    } finally {
      loading = false
    }
  }

  onMount(() => {
    fetchTally()
    // Check session vote status in parallel with tally fetch
    checkVoted(ballotId, getSessionId()).then((r) => { hasVoted = r.hasVoted })
    const interval = setInterval(fetchTally, 5000)
    return () => clearInterval(interval)
  })

  let mjWinner = $derived(tally?.mj[0]?.name ?? null)
  let starWinner = $derived(tally?.star[0]?.name ?? null)
  let agree = $derived(mjWinner !== null && mjWinner === starWinner)
</script>

<svelte:head>
  <title>Results — Star Judge</title>
</svelte:head>

{#if loading}
  <p class="loading">Computing results…</p>
{:else if error && !tally}
  <p class="error-msg">{error}</p>
{:else if tally}
  <div class="page-header">
    <h1>{tally.ballotName}</h1>
    <div class="header-meta">
      <span>{tally.voteCount} vote{tally.voteCount === 1 ? '' : 's'} cast</span>
      {#if lastUpdated}
        <span class="dot">·</span>
        <span class="updated">live · {lastUpdated.toLocaleTimeString()}</span>
      {/if}
      {#if hasVoted}
        <span class="dot">·</span>
        <span class="your-vote">your vote is counted ✓</span>
      {/if}
    </div>
  </div>

  {#if tally.voteCount === 0}
    <div class="card no-votes">
      <p>No votes yet — the ballot is open.</p>
      <a href="/vote/{tally.ballotId}" class="btn btn-primary">Cast the First Vote →</a>
    </div>
  {:else}
    <div class="winners card">
      {#if agree}
        <div class="winner-agree">
          <span class="crown">👑</span>
          <span>Both methods agree: <strong>{mjWinner}</strong> wins!</span>
        </div>
      {:else}
        <div class="winner-split">
          <div>
            <span class="method-tag">MJ says</span>
            <span class="winner-name">{mjWinner}</span>
          </div>
          <div class="vs">⚡ vs ⚡</div>
          <div>
            <span class="method-tag">STAR says</span>
            <span class="winner-name">{starWinner}</span>
          </div>
        </div>
      {/if}
    </div>

    <div class="methods">
      <section class="method-section card">
        <div class="method-header">
          <h2>Majority Judgment</h2>
          <p class="method-desc">
            Each game's median grade wins. When two games share a median, the one whose
            median is hardest to "move" wins — this makes it resilient to strategic voting.
          </p>
        </div>
        <TallyChart candidates={tally.mj} mode="mj" />
      </section>

      <section class="method-section card">
        <div class="method-header">
          <h2>STAR Voting</h2>
          <p class="method-desc">
            Average score (0–5) determines the top 2 finalists. Those two then go
            head-to-head: whoever more voters rated higher wins the runoff.
          </p>
        </div>
        <TallyChart candidates={tally.star} mode="star" />
      </section>
    </div>
  {/if}

  <div class="actions">
    <a href="/vote/{tally.ballotId}" class="btn btn-primary">
      {hasVoted ? 'Change Your Vote' : 'Cast Your Vote'} →
    </a>
  </div>
{/if}

<style>
  .loading { color: var(--text-muted); padding: 2rem 0; text-align: center; }

  .header-meta {
    display: flex;
    align-items: center;
    gap: .4rem;
    flex-wrap: wrap;
    color: var(--text-muted);
    font-size: .9rem;
    margin-top: .25rem;
  }

  .dot { color: var(--border); }

  .updated { color: var(--text-muted); }

  .your-vote {
    color: var(--teal);
    font-size: .85rem;
  }

  .no-votes {
    text-align: center;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: var(--text-muted);
    margin-bottom: 1.5rem;
  }

  .winners {
    margin-bottom: 1.5rem;
    text-align: center;
    padding: 1.25rem;
  }

  .winner-agree {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .6rem;
    font-size: 1.1rem;
  }

  .crown { font-size: 1.5rem; }

  .winner-split {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .method-tag {
    display: block;
    font-size: .75rem;
    color: var(--text-muted);
    margin-bottom: .2rem;
  }

  .winner-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--grade-excellent);
  }

  .vs { color: var(--text-muted); font-size: .9rem; }

  .methods {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .method-section { padding: 1.5rem; }

  .method-header { margin-bottom: 1.25rem; }

  .method-desc {
    font-size: .82rem;
    color: var(--text-muted);
    margin-top: .3rem;
    line-height: 1.5;
  }

  .actions { display: flex; gap: 1rem; margin-bottom: 2rem; }
</style>
