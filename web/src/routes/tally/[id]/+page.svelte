<script lang="ts">
import { onMount } from 'svelte';
import { page } from '$app/state';
import { ApiError, checkVoted, getSessionId, getTally } from '$lib/api';
import TallyChart from '$lib/components/TallyChart.svelte';
import { getMockScenario } from '$lib/mock-scenarios';
import type { RankedCandidate, TallyResponse } from '$lib/types';

const isMock = $derived(Number.isNaN(parseInt(page.params.id ?? '', 10)));
const ballotId = $derived(isMock ? 0 : parseInt(page.params.id ?? '', 10));

let tally = $state<TallyResponse | null>(null);
let hasVoted = $state(false);
let loading = $state(true);
let error = $state('');
let lastUpdated = $state<Date | null>(null);

async function fetchTally() {
  try {
    tally = await getTally(ballotId);
    lastUpdated = new Date();
  } catch (e) {
    if (!tally) error = e instanceof ApiError ? e.message : 'Failed to load results.';
  } finally {
    loading = false;
  }
}

onMount(() => {
  if (isMock) {
    try {
      const scenario = getMockScenario(page.params.id ?? '');
      if (scenario) {
        tally = scenario.tally;
      } else {
        error = `Unknown scenario: ${page.params.id ?? ''}`;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load mock scenario.';
    } finally {
      loading = false;
    }
    return;
  }
  fetchTally();
  checkVoted(ballotId, getSessionId()).then((r) => {
    hasVoted = r.hasVoted;
  });
  const interval = setInterval(fetchTally, 5000);
  return () => clearInterval(interval);
});

// ── Per-method winner helpers ─────────────────────────────────────────────
function firstNonVetoed(arr: RankedCandidate[] | undefined) {
  return arr?.find((c) => !c.vetoed)?.name ?? null;
}
function isTied(arr: RankedCandidate[] | undefined) {
  const survivors = arr?.filter((c) => !c.vetoed) ?? [];
  return survivors.length > 1 && survivors[0].rank === survivors[1].rank;
}
function tiedNames(arr: RankedCandidate[] | undefined) {
  const survivors = arr?.filter((c) => !c.vetoed) ?? [];
  if (!isTied(arr)) return [];
  return survivors.filter((c) => c.rank === survivors[0].rank).map((c) => c.name);
}
function winnerLabel(arr: RankedCandidate[] | undefined, paradox = false): string {
  if (paradox) return '🔄 Cycle';
  if (isTied(arr)) return `${tiedNames(arr).join(' & ')} (tie)`;
  return firstNonVetoed(arr) ?? '—';
}

const officialMethod = $derived(tally?.officialMethod ?? 'mj');

let methods = $derived(
  tally
    ? [
        { key: 'star', label: 'STAR', winner: winnerLabel(tally.star) },
        {
          key: 'ivstar',
          label: 'IV·STAR',
          winner: winnerLabel(tally.ivstar),
        },
        { key: 'mj', label: 'MJ', winner: winnerLabel(tally.mj) },
        { key: 'ivmj', label: 'IV·MJ', winner: winnerLabel(tally.ivmj) },
        { key: 'borda', label: 'Borda', winner: winnerLabel(tally.borda) },
        { key: 'irv', label: 'IRV', winner: winnerLabel(tally.irv) },
        {
          key: 'condorcet',
          label: 'Condorcet',
          winner: winnerLabel(tally.condorcet, tally.condorcetParadox),
        },
        {
          key: 'dictator',
          label: 'Dictator',
          winner: tally.dictatorName ? winnerLabel(tally.dictator) : '—',
        },
      ].sort((a, b) => (b.key === officialMethod ? 1 : 0) - (a.key === officialMethod ? 1 : 0))
    : []
);

// Returns null (no consensus), or a winner string (may be a tie like "A & B (tie)").
// All applicable methods must agree on the same string for consensus to fire.
// Condorcet is excluded when there's a paradox; Dictator is excluded when there's no voter.
let consensusWinner = $derived(
  !tally || tally.voteCount === 0
    ? null
    : (() => {
        const applicable = methods.filter(
          (m) => (m.key !== 'condorcet' || !tally!.condorcetParadox) && m.winner !== '—'
        );
        if (applicable.length === 0) return null;
        const unique = new Set(applicable.map((m) => m.winner));
        return unique.size === 1 ? [...unique][0] : null;
      })()
);

// If consensus is a tie, extract the tied names and pick one deterministically.
// Seed from ballotId + voteCount so it's stable across refreshes but varies per ballot.
let tiebreaker = $derived(
  !consensusWinner?.includes('(tie)')
    ? null
    : (() => {
        const names = consensusWinner.replace(' (tie)', '').split(' & ');
        const seed = (tally?.ballotId ?? 0) * 997 + (tally?.voteCount ?? 0);
        return names[seed % names.length];
      })()
);

let anyVetoedInMJ = $derived(tally?.ivmj.some((c) => c.vetoed) ?? false);
let anyVetoedInStar = $derived(tally?.ivstar.some((c) => c.vetoed) ?? false);
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
      <span>{tally.voteCount} vote{tally.voteCount === 1 ? "" : "s"} cast</span>
      {#if !isMock && lastUpdated}
        <span class="dot">·</span>
        <span class="updated">live · {lastUpdated.toLocaleTimeString()}</span>
      {/if}
      {#if isMock}
        <span class="dot">·</span>
        <span class="mock-badge">mock data</span>
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
      {#if !isMock}
        <a href="/vote/{tally.ballotId}" class="btn btn-primary"
          >Cast the First Vote →</a
        >
      {/if}
    </div>
  {:else}
    <!-- ── Winners summary ──────────────────────────────────────────────── -->
    <div class="winners card">
      {#if consensusWinner}
        {#if tiebreaker}
          <div class="winner-agree">
            <span class="crown">👑</span>
            <div class="tie-consensus">
              <span>All methods agree: <strong>{consensusWinner}</strong></span>
              <span class="tiebreaker-line"
                >Random tiebreaker: <strong class="tiebreaker-pick"
                  >{tiebreaker}</strong
                ></span
              >
            </div>
          </div>
        {:else}
          <div class="winner-agree">
            <span class="crown">👑</span>
            <span
              >All methods agree: <strong>{consensusWinner}</strong> wins!</span
            >
          </div>
        {/if}
      {:else}
        <div class="winner-grid">
          {#each methods as m}
            <div
              class="method-winner"
              class:method-winner-official={m.key === officialMethod}
            >
              <span class="method-tag"
                >{m.label}{#if m.key === officialMethod}
                  ★{/if}</span
              >
              <span
                class="winner-name"
                class:cycle={m.winner.startsWith("🔄")}
                class:tied={m.winner.includes("tie")}>{m.winner}</span
              >
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- ── Method sections ─────────────────────────────────────────────── -->
    <div class="methods">
      <!-- Row 1: MJ pair -->
      <div class="method-pair">
        <section
          class="method-section card"
          class:official-section={officialMethod === "mj"}
        >
          <div class="method-header">
            <h2>
              <a
                class="wiki-link"
                href="https://en.wikipedia.org/wiki/Majority_judgment"
                target="_blank"
                rel="noopener">Majority Judgment</a
              >
              {#if officialMethod === "mj"}<span class="official-badge"
                  >official</span
                >{/if}
            </h2>
            <p class="method-desc">
              Each game's median grade wins. Ties broken by how resilient that
              median is to being moved — resistant to strategic voting.
            </p>
          </div>
          <TallyChart candidates={tally.mj} mode="mj" />
        </section>
        <section
          class="method-section card iv-section"
          class:official-section={officialMethod === "ivmj"}
        >
          <div class="method-header">
            <h2>
              IV · Majority Judgment
              {#if officialMethod === "ivmj"}<span class="official-badge"
                  >official</span
                >{/if}
            </h2>
            <p class="method-desc">
              Games with more Hard Passes than the least-vetoed game are
              disqualified first, then MJ ranks the survivors.
            </p>
          </div>
          {#if !anyVetoedInMJ}
            <p class="no-veto-note">No games vetoed — same result as MJ.</p>
          {:else}
            <TallyChart candidates={tally.ivmj} mode="mj" />
          {/if}
        </section>
      </div>

      <!-- Row 2: STAR pair -->
      <div class="method-pair">
        <section
          class="method-section card"
          class:official-section={officialMethod === "star"}
        >
          <div class="method-header">
            <h2>
              <a
                class="wiki-link"
                href="https://en.wikipedia.org/wiki/STAR_voting"
                target="_blank"
                rel="noopener">STAR Voting</a
              >
              {#if officialMethod === "star"}<span class="official-badge"
                  >official</span
                >{/if}
            </h2>
            <p class="method-desc">
              Highest average score picks the top 2 finalists. Ties for 2nd are
              broken by pairwise head-to-head. Those two go head-to-head:
              whoever more voters rated higher wins the runoff.
            </p>
          </div>
          <TallyChart candidates={tally.star} mode="star" />
        </section>
        <section
          class="method-section card iv-section"
          class:official-section={officialMethod === "ivstar"}
        >
          <div class="method-header">
            <h2>
              IV · STAR Voting
              {#if officialMethod === "ivstar"}<span class="official-badge"
                  >official</span
                >{/if}
            </h2>
            <p class="method-desc">
              Vetoed games are removed before scoring. Survivors compete in the
              normal STAR score + runoff.
            </p>
          </div>
          {#if !anyVetoedInStar}
            <p class="no-veto-note">No games vetoed — same result as STAR.</p>
          {:else}
            <TallyChart candidates={tally.ivstar} mode="star" />
          {/if}
        </section>
      </div>

      <!-- Row 3: Borda + IRV -->
      <div class="method-pair">
        <section
          class="method-section card"
          class:official-section={officialMethod === "borda"}
        >
          <div class="method-header">
            <h2>
              <a
                class="wiki-link"
                href="https://en.wikipedia.org/wiki/Borda_count"
                target="_blank"
                rel="noopener">Borda Count</a
              >
              {#if officialMethod === "borda"}<span class="official-badge"
                  >official</span
                >{/if}
            </h2>
            <p class="method-desc">
              Each voter ranks all games. Points are awarded by rank (top = N−1
              pts, bottom = 0 pts). Tied grades split the points evenly. Highest
              total wins.
            </p>
          </div>
          <TallyChart candidates={tally.borda} mode="borda" />
        </section>
        <section
          class="method-section card"
          class:official-section={officialMethod === "irv"}
        >
          <div class="method-header">
            <h2>
              <a
                class="wiki-link"
                href="https://en.wikipedia.org/wiki/Instant-runoff_voting"
                target="_blank"
                rel="noopener">Instant Runoff (IRV)</a
              >
              {#if officialMethod === "irv"}<span class="official-badge"
                  >official</span
                >{/if}
            </h2>
            <p class="method-desc">
              Voters' top remaining choice gets their vote each round. The
              last-place game is eliminated and votes redistribute — until one
              game holds a majority.
            </p>
          </div>
          <TallyChart candidates={tally.irv} mode="irv" />
        </section>
      </div>

      <!-- Row 4: Condorcet + Dictator -->
      <div class="method-pair">
        <section
          class="method-section card"
          class:official-section={officialMethod === "condorcet"}
        >
          <div class="method-header">
            <h2>
              <a
                class="wiki-link"
                href="https://en.wikipedia.org/wiki/Condorcet_method"
                target="_blank"
                rel="noopener">Condorcet</a
              >
              {#if officialMethod === "condorcet"}<span class="official-badge"
                  >official</span
                >{/if}
            </h2>
            <p class="method-desc">
              Every game fights every other game head-to-head. The game that
              beats all others wins. If there's a rock-paper-scissors cycle…
              nobody wins. 🔄
            </p>
          </div>
          {#if tally.condorcetParadox}
            <div class="paradox-banner">
              🔄 <strong>Condorcet paradox!</strong> A beats B beats C beats A —
              no winner exists.
            </div>
          {/if}
          <TallyChart
            candidates={tally.condorcet}
            mode="condorcet"
            condorcetParadox={tally.condorcetParadox}
          />
        </section>
        <section
          class="method-section card dictator-section"
          class:official-section={officialMethod === "dictator"}
        >
          <div class="method-header">
            <h2>
              Dictator
              {#if officialMethod === "dictator"}<span class="official-badge"
                  >official</span
                >{/if}
            </h2>
            <p class="method-desc">
              Democracy is cancelled. The last person to vote picks everything.
              Bars show what everyone wanted — ranking shows what the dictator
              gets.
            </p>
          </div>
          {#if tally.dictatorName}
            <p class="dictator-name">
              👑 Dictator: <strong>{tally.dictatorName}</strong>
            </p>
          {:else}
            <p class="no-veto-note">No votes yet.</p>
          {/if}
          <TallyChart
            candidates={tally.dictator}
            mode="dictator"
            dictatorName={tally.dictatorName}
          />
        </section>
      </div>
    </div>
  {/if}

  <div class="actions">
    {#if isMock}
      <a href="/" class="btn btn-ghost">← Back to Home</a>
    {:else}
      <a href="/vote/{tally.ballotId}" class="btn btn-primary">
        {hasVoted ? "Change Your Vote" : "Cast Your Vote"} →
      </a>
    {/if}
  </div>
{/if}

<style>
  .loading {
    color: var(--text-muted);
    padding: 2rem 0;
    text-align: center;
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-top: 0.25rem;
  }

  .dot {
    color: var(--border);
  }
  .updated {
    color: var(--text-muted);
  }

  .mock-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
    background: color-mix(in srgb, var(--accent-dim) 40%, var(--bg-card));
    color: var(--accent);
  }

  .your-vote {
    color: var(--teal);
    font-size: 0.85rem;
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

  /* ── Winners card ────────────────────────────────────────────────────── */
  .winners {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    text-align: center;
  }

  .winner-agree {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    font-size: 1.1rem;
  }

  .crown {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .tie-consensus {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    text-align: left;
  }

  .tiebreaker-line {
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .tiebreaker-pick {
    color: var(--grade-excellent);
  }

  .winner-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem 1rem;
    text-align: left;
  }

  @media (max-width: 600px) {
    .winner-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .method-winner {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .method-winner-official .method-tag {
    color: var(--teal);
  }
  .method-winner-official .winner-name {
    color: var(--teal);
  }

  .method-tag {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .winner-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--grade-excellent);
  }

  .winner-name.cycle {
    color: var(--accent);
    font-size: 0.85rem;
  }
  .winner-name.tied {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  /* ── Method sections ─────────────────────────────────────────────────── */
  .methods {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .method-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 720px) {
    .method-pair {
      grid-template-columns: 1fr;
    }
  }

  .method-section {
    padding: 1.5rem;
  }
  .method-header {
    margin-bottom: 1.25rem;
  }

  .method-desc {
    font-size: 0.82rem;
    color: var(--text-muted);
    margin-top: 0.3rem;
    line-height: 1.5;
  }

  .iv-section {
    border-color: color-mix(in srgb, var(--danger) 30%, var(--border));
  }

  .dictator-section {
    border-color: color-mix(in srgb, var(--grade-excellent) 25%, var(--border));
  }

  .official-section {
    border-color: var(--teal) !important;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--teal) 25%, transparent);
  }

  .official-badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    background: color-mix(in srgb, var(--teal) 18%, var(--bg-card));
    color: var(--teal);
    vertical-align: middle;
    margin-left: 0.4rem;
  }

  /* Wikipedia links — invisible until hovered */
  .wiki-link {
    color: inherit;
    text-decoration: none;
  }
  .wiki-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: color-mix(
      in srgb,
      var(--text-muted) 60%,
      transparent
    );
  }

  .no-veto-note {
    color: var(--text-muted);
    font-size: 0.82rem;
    font-style: italic;
    padding: 1rem 0;
  }

  .paradox-banner {
    background: color-mix(in srgb, var(--accent-dim) 25%, var(--bg-card));
    border: 1px solid var(--accent-dim);
    border-radius: 6px;
    padding: 0.65rem 0.9rem;
    font-size: 0.85rem;
    color: var(--accent);
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .dictator-name {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .dictator-name strong {
    color: var(--grade-excellent);
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }
</style>
