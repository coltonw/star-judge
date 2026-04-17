<script lang="ts">
import { goto } from '$app/navigation';
import { ApiError, createBallot } from '$lib/api';
import GamePicker from '$lib/components/GamePicker.svelte';
import type { Candidate } from '$lib/types';

let name = $state('');
let selectedGames = $state<Candidate[]>([]);
let submitting = $state(false);
let error = $state('');

async function submit() {
  if (!name.trim() || selectedGames.length < 2) return;
  submitting = true;
  error = '';
  try {
    await createBallot(name.trim(), selectedGames);
    goto(`/admin`);
  } catch (e) {
    error = e instanceof ApiError ? e.message : 'Failed to create ballot.';
    submitting = false;
  }
}
</script>

<svelte:head>
  <title>New Ballot — Star Judge</title>
</svelte:head>

<div class="page-header">
  <h1>New Ballot</h1>
  <p>Pick a name and select the games to vote on.</p>
</div>

<form onsubmit={(e) => { e.preventDefault(); submit() }}>
  <div class="field">
    <label for="ballot-name">Ballot name</label>
    <input
      id="ballot-name"
      type="text"
      placeholder="e.g. April Game Night"
      bind:value={name}
      required
    />
  </div>

  <div class="field">
    <label>Games <span class="muted">(select at least 2)</span></label>
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
      {submitting ? 'Creating…' : 'Create Ballot'}
    </button>
    <a href="/admin" class="btn btn-ghost">Cancel</a>
  </div>
</form>

<style>
  .muted { color: var(--text-muted); font-weight: 400; }
  .actions { display: flex; gap: 1rem; margin-top: 1rem; }
</style>
