<script lang="ts">
import type { Candidate } from '@star-judge/shared';
import { onMount } from 'svelte';
import { ApiError, getBggCollection } from '$lib/api';

let {
  selected = $bindable<Candidate[]>([]),
  username = 'dagreenmachine',
}: { selected: Candidate[]; username?: string } = $props();

let allGames = $state<Candidate[]>([]);
let search = $state('');
let loading = $state(false);
let retrying = $state(false);
let error = $state('');
let manualText = $state('');
let useManual = $state(false);

let manualCandidates = $derived<Candidate[]>(
  manualText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name, i) => ({ id: `manual-${i}`, name, thumbnail: '' }))
);

let source = $derived(useManual ? manualCandidates : allGames);
let filtered = $derived(source.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())));
let selectedIds = $derived(new Set(selected.map((c) => c.id)));

async function fetchCollection() {
  loading = true;
  error = '';
  try {
    const result = await getBggCollection(username);
    if ('retry' in result) {
      retrying = true;
      setTimeout(fetchCollection, 10000);
      return;
    }
    retrying = false;
    allGames = result.candidates;
  } catch (e) {
    error = e instanceof ApiError ? e.message : 'Failed to load BGG collection.';
  } finally {
    loading = false;
  }
}

onMount(fetchCollection);

function toggle(game: Candidate) {
  if (selectedIds.has(game.id)) {
    selected = selected.filter((c) => c.id !== game.id);
  } else {
    selected = [...selected, game];
  }
}

function switchToManual() {
  useManual = true;
  selected = [];
}

function switchToBgg() {
  useManual = false;
  selected = [];
}
</script>

<div class="picker">
  {#if loading && !retrying}
    <p class="status">Loading your BGG collection…</p>
  {:else if retrying}
    <p class="status">BGG is preparing your collection, retrying…</p>
  {:else if error && !useManual}
    <div class="error-section">
      <p class="error-msg">{error}</p>
      <div class="mode-actions">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          onclick={fetchCollection}>Retry BGG</button
        >
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          onclick={switchToManual}>Enter games manually</button
        >
      </div>
    </div>
  {:else}
    {#if !error}
      <div class="mode-bar">
        {#if useManual}
          <button type="button" class="mode-btn active" disabled
            >Manual entry</button
          >
          <button type="button" class="mode-btn" onclick={switchToBgg}
            >BGG collection</button
          >
        {:else}
          <button type="button" class="mode-btn active" disabled
            >BGG collection</button
          >
          <button type="button" class="mode-btn" onclick={switchToManual}
            >Manual entry</button
          >
        {/if}
      </div>
    {/if}

    {#if useManual}
      <div class="manual-entry">
        <label for="manual-names" class="manual-label"
          >Enter one game name per line:</label
        >
        <textarea
          id="manual-names"
          placeholder="Wingspan&#10;Terraforming Mars&#10;Ticket to Ride"
          bind:value={manualText}
          rows="6"
        ></textarea>
      </div>
    {/if}

    {#if source.length > 0}
      <div class="search-row">
        <input
          type="search"
          placeholder="Search {source.length} games…"
          bind:value={search}
        />
        <span class="count">{selected.length} selected</span>
      </div>

      <div class="game-grid">
        {#each filtered as game (game.id)}
          <button
            type="button"
            class="game-tile"
            class:selected={selectedIds.has(game.id)}
            onclick={() => toggle(game)}
          >
            {#if game.thumbnail}
              <img src={game.thumbnail} alt={game.name} />
            {/if}
            <span class="game-label">{game.name}</span>
            {#if selectedIds.has(game.id)}
              <span class="check">✓</span>
            {/if}
          </button>
        {/each}
      </div>
    {:else if useManual}
      <p class="status">Type game names above to add them.</p>
    {/if}
  {/if}
</div>

<style>
  .status {
    color: var(--text-muted);
    margin: 1rem 0;
  }

  .error-section {
    margin: 1rem 0;
  }
  .mode-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .mode-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .mode-btn {
    padding: 0.3rem 0.75rem;
    border: 1.5px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text-muted);
    font-size: 0.8rem;
    cursor: pointer;
  }
  .mode-btn.active {
    border-color: var(--accent);
    color: var(--accent);
    cursor: default;
  }

  .manual-entry {
    margin-bottom: 1rem;
  }
  .manual-label {
    display: block;
    font-size: 0.85rem;
    margin-bottom: 0.4rem;
    color: var(--text-muted);
  }
  textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1.5px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
    resize: vertical;
    box-sizing: border-box;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .count {
    font-size: 0.85rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
    padding: 0.25rem;
  }

  .game-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 0.6rem 0.4rem;
    border-radius: 7px;
    border: 1.5px solid var(--border);
    background: var(--bg);
    cursor: pointer;
    position: relative;
    transition:
      border-color 0.15s,
      background 0.15s;
    text-align: center;
  }

  .game-tile:hover {
    border-color: var(--accent);
    background: var(--bg-hover);
  }

  .game-tile.selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--bg-card));
  }

  .game-tile img {
    width: 64px;
    height: 64px;
    object-fit: cover;
    object-position: top center;
    border-radius: 4px;
  }

  .game-label {
    font-size: 0.72rem;
    line-height: 1.3;
    color: var(--text);
  }

  .check {
    position: absolute;
    top: 0.3rem;
    right: 0.4rem;
    font-size: 0.8rem;
    color: var(--accent);
    font-weight: 700;
  }

  .btn-sm {
    padding: 0.3rem 0.75rem;
    font-size: 0.85rem;
  }
</style>
