<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { getBallot, castVote, getSessionId, checkVoted, ApiError } from '$lib/api'
  import type { ExistingVote } from '$lib/api'
  import { GRADES, GRADE_LABELS, GRADE_COLORS, type Grade, type Ballot } from '$lib/types'

  const ballotId = $derived(parseInt(page.params.id ?? '', 10))

  let ballot = $state<Ballot | null>(null)
  let ratings = $state<Record<string, Grade>>({})
  let voterName = $state('')
  let nameTouched = $state(false)
  let isUpdate = $state(false)
  let loading = $state(true)
  let submitting = $state(false)
  let error = $state('')

  let submitAttempted = $state(false)

  let nameError = $derived(
    nameTouched && !voterName.trim() ? 'Please enter your name.' : ''
  )

  let hardPassError = $derived((() => {
    if (!submitAttempted || !ballot) return ''
    const required = Math.ceil(ballot.candidates.length / 2)
    const abovePoor = ballot.candidates.filter(c => ratings[c.id] && ratings[c.id] !== 'poor').length
    if (abovePoor < required) {
      return `Rate at least ${required} game${required === 1 ? '' : 's'} above Hard Pass — this prevents gaming the veto.`
    }
    return ''
  })())

  onMount(async () => {
    try {
      ballot = await getBallot(ballotId)
      if (!ballot.active) {
        error = 'This ballot is closed.'
        loading = false
        return
      }
      // Pre-fill form if session already voted
      const existing = await checkVoted(ballotId, getSessionId())
      if (existing.hasVoted) {
        isUpdate = true
        voterName = existing.voterName
        ratings = existing.ratings as Record<string, Grade>
      } else {
        // Default all ratings to 'good' so the form is never blank
        for (const c of ballot.candidates) {
          ratings[c.id] = 'good'
        }
      }
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to load ballot.'
    } finally {
      loading = false
    }
  })

  function allRated(): boolean {
    if (!ballot) return false
    return ballot.candidates.every((c) => ratings[c.id])
  }

  async function submit() {
    nameTouched = true
    submitAttempted = true
    if (!ballot || !voterName.trim() || !allRated() || hardPassError) return
    submitting = true
    error = ''
    try {
      await castVote(ballot.id, voterName.trim(), getSessionId(), ratings)
      goto(`/tally/${ballot.id}`)
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to submit vote.'
      submitting = false
    }
  }
</script>

<svelte:head>
  <title>Vote — Star Judge</title>
</svelte:head>

{#if loading}
  <p class="loading">Loading ballot…</p>
{:else if error && !ballot}
  <div class="page-header">
    <h1>Oops</h1>
    <p class="error-msg">{error}</p>
  </div>
{:else if ballot}
  <div class="page-header">
    <h1>{ballot.name}</h1>
    <p>
      {#if isUpdate}
        Your previous ratings are pre-filled — adjust anything and resubmit.
      {:else}
        Rate each game — the same scale feeds both Majority Judgment and STAR results.
      {/if}
    </p>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); submit() }}>
    <div class="field">
      <label for="voter-name">Your name</label>
      <input
        id="voter-name"
        type="text"
        placeholder="e.g. Alice"
        bind:value={voterName}
        onblur={() => (nameTouched = true)}
        maxlength="100"
        aria-invalid={!!nameError}
        aria-describedby={nameError ? 'name-error' : undefined}
      />
      {#if nameError}
        <p id="name-error" class="field-error">{nameError}</p>
      {/if}
    </div>

    <div class="games">
      {#each ballot.candidates as candidate (candidate.id)}
        <div class="game-card card">
          <div class="game-info">
            {#if candidate.thumbnail}
              <img src={candidate.thumbnail} alt={candidate.name} class="thumb" />
            {/if}
            <span class="game-name">{candidate.name}</span>
          </div>
          <div class="grade-picker" role="group" aria-label="Rating for {candidate.name}">
            {#each GRADES as grade}
              <label
                class="grade-btn"
                class:selected={ratings[candidate.id] === grade}
                style:--grade-color={GRADE_COLORS[grade]}
              >
                <input
                  type="radio"
                  name={candidate.id}
                  value={grade}
                  bind:group={ratings[candidate.id]}
                />
                {GRADE_LABELS[grade]}
              </label>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    {#if hardPassError}
      <p class="field-error hp-error">{hardPassError}</p>
    {/if}

    {#if error}
      <p class="error-msg">{error}</p>
    {/if}

    <div class="submit-row">
      <button
        type="submit"
        class="btn btn-primary"
        disabled={submitting}
      >
        {submitting ? 'Submitting…' : isUpdate ? 'Update Vote' : 'Submit Vote'}
      </button>
      <a href="/tally/{ballot.id}" class="btn btn-ghost">
        {isUpdate ? 'Cancel' : 'Skip & see results'}
      </a>
    </div>
  </form>
{/if}

<style>
  .loading { color: var(--text-muted); padding: 2rem 0; text-align: center; }

  .games {
    display: flex;
    flex-direction: column;
    gap: .75rem;
    margin-bottom: 1.5rem;
  }

  .game-card {
    padding: 1rem 1.25rem;
  }

  .game-info {
    display: flex;
    align-items: center;
    gap: .75rem;
    margin-bottom: .75rem;
  }

  .thumb {
    width: 44px;
    height: 44px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .game-name {
    font-weight: 600;
    font-size: 1rem;
  }

  .grade-picker {
    display: flex;
    flex-wrap: wrap;
    gap: .4rem;
  }

  .grade-btn {
    display: inline-flex;
    align-items: center;
    padding: .35rem .75rem;
    border-radius: 5px;
    font-size: .82rem;
    font-weight: 500;
    cursor: pointer;
    border: 1.5px solid transparent;
    background: var(--bg-hover);
    color: var(--text-muted);
    transition: all .15s;
    user-select: none;
  }

  .grade-btn input {
    display: none;
  }

  .grade-btn.selected {
    border-color: var(--grade-color);
    color: var(--grade-color);
    background: color-mix(in srgb, var(--grade-color) 12%, var(--bg-card));
  }

  .grade-btn:hover {
    border-color: var(--grade-color);
    color: var(--grade-color);
  }

  .submit-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .field-error {
    color: var(--danger);
    font-size: .82rem;
    margin-top: .3rem;
  }

  .hp-error {
    margin-bottom: .75rem;
  }

  input[aria-invalid="true"] {
    border-color: var(--danger);
  }
</style>
