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

let filtered = $derived(allGames.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())));

let selectedIds = $derived(new Set(selected.map((c) => c.id)));

async function fetchCollection() {
  loading = true;
  error = '';
  try {
    const result = await getBggCollection(username);
    if ('retry' in result) {
      retrying = true;
      setTimeout(fetchCollection, 3000);
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
</script>

<div class="picker">
  {#if loading && !retrying}
    <p class="status">Loading your BGG collection…</p>
  {:else if retrying}
    <p class="status">BGG is preparing your collection, retrying…</p>
  {:else if error}
    <p class="error-msg">{error}</p>
  {:else}
    <div class="search-row">
      <input
        type="search"
        placeholder="Search {allGames.length} games…"
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
  {/if}
</div>

<style>
  .status { color: var(--text-muted); margin: 1rem 0; }

  .search-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .count {
    font-size: .85rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: .5rem;
    max-height: 400px;
    overflow-y: auto;
    padding: .25rem;
  }

  .game-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .35rem;
    padding: .6rem .4rem;
    border-radius: 7px;
    border: 1.5px solid var(--border);
    background: var(--bg);
    cursor: pointer;
    position: relative;
    transition: border-color .15s, background .15s;
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
    border-radius: 4px;
  }

  .game-label {
    font-size: .72rem;
    line-height: 1.3;
    color: var(--text);
  }

  .check {
    position: absolute;
    top: .3rem;
    right: .4rem;
    font-size: .8rem;
    color: var(--accent);
    font-weight: 700;
  }
</style>
