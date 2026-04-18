<script lang="ts">
import { type Ballot, type Candidate, VOTING_METHOD_LABELS, type VotingMethodKey } from '@star-judge/shared';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { ApiError, getBallot, updateBallot } from '$lib/api';
import GamePicker from '$lib/components/GamePicker.svelte';

const ballotId = $derived(parseInt(page.params.id ?? '', 10));

let ballot = $state<Ballot | null>(null);
let name = $state('');
let selectedGames = $state<Candidate[]>([]);
let active = $state(true);
let officialMethod = $state<VotingMethodKey>('ivstar');
let loading = $state(true);
let submitting = $state(false);
let error = $state('');

onMount(async () => {
  try {
    ballot = await getBallot(ballotId);
    name = ballot.name;
    selectedGames = ballot.candidates;
    active = ballot.active;
    officialMethod = ballot.officialMethod ?? 'mj';
  } catch (e) {
    error = e instanceof ApiError ? e.message : 'Failed to load ballot.';
  } finally {
    loading = false;
  }
});

async function submit() {
  if (!name.trim() || selectedGames.length < 2) return;
  submitting = true;
  error = '';
  try {
    await updateBallot(ballotId, name.trim(), selectedGames, active, officialMethod);
    goto('/admin');
  } catch (e) {
    error = e instanceof ApiError ? e.message : 'Failed to update ballot.';
    submitting = false;
  }
}
</script>

<svelte:head>
  <title>Edit Ballot — Star Judge</title>
</svelte:head>

{#if loading}
  <p class="muted">Loading…</p>
{:else if error && !ballot}
  <p class="error-msg">{error}</p>
{:else if ballot}
  <div class="page-header">
    <h1>Edit Ballot</h1>
    <p>{ballot.candidates.length} games · created {new Date(ballot.created_at).toLocaleDateString()}</p>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); submit() }}>
    <div class="field">
      <label for="ballot-name">Ballot name</label>
      <input id="ballot-name" type="text" bind:value={name} required />
    </div>

    <div class="field check-row">
      <label class="inline-label">
        <input type="checkbox" bind:checked={active} />
        Active (voters can cast votes)
      </label>
    </div>

    <div class="field">
      <label for="official-method">Official voting method</label>
      <select id="official-method" bind:value={officialMethod}>
        {#each Object.entries(VOTING_METHOD_LABELS) as [key, label]}
          <option value={key}>{label}</option>
        {/each}
      </select>
      <p class="field-hint">Shown first and highlighted on the results page.</p>
    </div>

    <div class="field">
      <label>Games</label>
      <GamePicker bind:selected={selectedGames} />
    </div>

    {#if error}
      <p class="error-msg">{error}</p>
    {/if}

    <div class="actions">
      <button
        type="submit"
        class="btn btn-primary"
        disabled={submitting || !name.trim() || selectedGames.length < 2}
      >
        {submitting ? 'Saving…' : 'Save Changes'}
      </button>
      <a href="/admin" class="btn btn-ghost">Cancel</a>
      <a href="/tally/{ballot.id}" class="btn btn-ghost">View Results</a>
    </div>
  </form>
{/if}

<style>
  .muted { color: var(--text-muted); }
  .actions { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
  .field-hint { font-size: .8rem; color: var(--text-muted); margin-top: .3rem; }

  .check-row { margin-bottom: 1rem; }

  .inline-label {
    display: flex;
    align-items: center;
    gap: .5rem;
    cursor: pointer;
    color: var(--text);
    font-size: .95rem;
  }

  .inline-label input[type="checkbox"] {
    width: auto;
    cursor: pointer;
  }
</style>
