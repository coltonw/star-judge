<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import { getTally, ApiError } from '$lib/api'
  import TallyChart from '$lib/components/TallyChart.svelte'
  import type { TallyResponse } from '$lib/types'

  const ballotId = $derived(parseInt(page.params.id, 10))

  let tally = $state<TallyResponse | null>(null)
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
    <p>{tally.voteCount} vote{tally.voteCount === 1 ? '' : 's'} cast
      {#if lastUpdated}· updated {lastUpdated.toLocaleTimeString()}{/if}
    </p>
  </div>

  {#if tally.voteCount > 0}
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
  {/if}

  <div class="methods">
    <section class="method-section card">
      <div class="method-header">
        <h2>Majority Judgment</h2>
        <span class="method-desc">Ranked by median grade, with distance tiebreaking</span>
      </div>
      <TallyChart candidates={tally.mj} />
    </section>

    <section class="method-section card">
      <div class="method-header">
        <h2>STAR Voting</h2>
        <span class="method-desc">Score totals → top 2 in head-to-head runoff</span>
      </div>
      <TallyChart candidates={tally.star} />
    </section>
  </div>

  <div class="actions">
    <a href="/vote/{tally.ballotId}" class="btn btn-ghost">← Cast or change vote</a>
  </div>
{/if}

<style>
  .loading { color: var(--text-muted); padding: 2rem 0; text-align: center; }

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

  .vs {
    color: var(--text-muted);
    font-size: .9rem;
  }

  .methods {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .method-section { padding: 1.5rem; }

  .method-header {
    margin-bottom: 1.25rem;
  }

  .method-desc {
    font-size: .82rem;
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    gap: 1rem;
  }
</style>
