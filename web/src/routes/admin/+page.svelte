<script lang="ts">
import type { Ballot } from '@star-judge/shared';
import { onMount } from 'svelte';
import { ApiError, deleteBallot, getBallots, updateBallot } from '$lib/api';

let ballots = $state<Ballot[]>([]);
let loading = $state(true);
let error = $state('');

onMount(async () => {
  try {
    ballots = await getBallots();
  } catch (e) {
    error = e instanceof ApiError ? e.message : 'Failed to load ballots.';
  } finally {
    loading = false;
  }
});

async function toggleActive(ballot: Ballot) {
  try {
    const updated = await updateBallot(ballot.id, ballot.name, ballot.candidates, !ballot.active);
    ballots = ballots.map((b) => (b.id === updated.id ? updated : b));
  } catch (e) {
    error = e instanceof ApiError ? e.message : 'Failed to update ballot.';
  }
}

async function remove(id: number) {
  if (!confirm('Delete this ballot and all its votes?')) return;
  try {
    await deleteBallot(id);
    ballots = ballots.filter((b) => b.id !== id);
  } catch (e) {
    error = e instanceof ApiError ? e.message : 'Failed to delete ballot.';
  }
}
</script>

<svelte:head>
  <title>Admin — Star Judge</title>
</svelte:head>

<div class="page-header">
  <h1>Admin</h1>
  <p>Manage ballots for game night.</p>
</div>

<div class="toolbar">
  <a href="/admin/ballots/new" class="btn btn-primary">+ New Ballot</a>
</div>

{#if error}
  <p class="error-msg">{error}</p>
{/if}

{#if loading}
  <p class="muted">Loading…</p>
{:else if ballots.length === 0}
  <p class="muted">No ballots yet. Create one above.</p>
{:else}
  <div class="ballot-list">
    {#each ballots as ballot (ballot.id)}
      <div class="card ballot-row">
        <div class="ballot-info">
          <span class="ballot-name">{ballot.name}</span>
          <span class="badge {ballot.active ? 'badge-active' : 'badge-closed'}">
            {ballot.active ? 'Active' : 'Closed'}
          </span>
          <span class="ballot-meta">{ballot.candidates.length} games</span>
        </div>
        <div class="ballot-actions">
          <a href="/tally/{ballot.id}" class="btn btn-ghost">Results</a>
          <a href="/admin/ballots/{ballot.id}" class="btn btn-ghost">Edit</a>
          <button class="btn btn-ghost" onclick={() => toggleActive(ballot)}>
            {ballot.active ? 'Close' : 'Activate'}
          </button>
          <button class="btn btn-danger" onclick={() => remove(ballot.id)}>Delete</button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toolbar { margin-bottom: 1.5rem; }
  .muted { color: var(--text-muted); }

  .ballot-list {
    display: flex;
    flex-direction: column;
    gap: .75rem;
  }

  .ballot-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1rem 1.25rem;
  }

  .ballot-info {
    display: flex;
    align-items: center;
    gap: .75rem;
    flex-wrap: wrap;
  }

  .ballot-name { font-weight: 600; }

  .ballot-meta { font-size: .85rem; color: var(--text-muted); }

  .ballot-actions {
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
  }
</style>
