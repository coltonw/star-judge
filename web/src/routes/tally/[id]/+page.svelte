<script lang="ts">
import type { TallyResponse } from '@star-judge/shared';
import { page } from '$app/state';
import { ApiError, checkVoted, getSessionId, getTally } from '$lib/api';
import MethodCard from '$lib/components/MethodCard.svelte';
import { computeConsensus, pickTiebreaker, summarizeMethods } from '$lib/consensus';
import { getMockScenario } from '$lib/mock-scenarios';

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
    error = '';
  } catch (e) {
    // Keep showing the last good tally on transient errors — only surface the
    // error when we have nothing to show.
    if (!tally) {
      if (e instanceof ApiError) {
        error = e.kind === 'network' ? 'Network error — check your connection.' : e.message;
      } else {
        error = 'Failed to load results.';
      }
    }
  } finally {
    loading = false;
  }
}

// Mock scenarios load synchronously; real ballots poll every 5s.
$effect(() => {
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

const officialMethod = $derived(tally?.officialMethod ?? 'mj');
const methods = $derived(tally ? summarizeMethods(tally) : []);
const consensusWinner = $derived(tally ? computeConsensus(tally, methods) : null);
const tiebreaker = $derived(tally ? pickTiebreaker(tally, consensusWinner) : null);
const anyVetoedInMJ = $derived(tally?.ivmj.some((c) => c.vetoed) ?? false);
const anyVetoedInStar = $derived(tally?.ivstar.some((c) => c.vetoed) ?? false);
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
        <a href="/vote/{tally.ballotId}" class="btn btn-primary">Cast the First Vote →</a>
      {/if}
    </div>
  {:else}
    <div class="winners card">
      {#if consensusWinner}
        {#if tiebreaker}
          <div class="winner-agree">
            <span class="crown">👑</span>
            <div class="tie-consensus">
              <span>All methods agree: <strong>{consensusWinner}</strong></span>
              <span class="tiebreaker-line">Random tiebreaker: <strong class="tiebreaker-pick">{tiebreaker}</strong></span>
            </div>
          </div>
        {:else}
          <div class="winner-agree">
            <span class="crown">👑</span>
            <span>All methods agree: <strong>{consensusWinner}</strong> wins!</span>
          </div>
        {/if}
      {:else}
        <div class="winner-grid">
          {#each methods as m}
            <div class="method-winner" class:method-winner-official={m.key === officialMethod}>
              <span class="method-tag">{m.label}{#if m.key === officialMethod} ★{/if}</span>
              <span class="winner-name" class:cycle={m.winner.startsWith('🔄')} class:tied={m.winner.includes('tie')}>{m.winner}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="methods">
      <div class="method-pair">
        <MethodCard
          methodKey="star"
          title="STAR Voting"
          wikiUrl="https://en.wikipedia.org/wiki/STAR_voting"
          description="Highest average score picks the top 2 finalists. Ties for 2nd are broken by pairwise head-to-head. Those two go head-to-head: whoever more voters rated higher wins the runoff."
          official={officialMethod === 'star'}
          candidates={tally.star}
          mode="star"
        />
        <MethodCard
          methodKey="ivstar"
          title="IV · STAR Voting"
          description="Vetoed games are removed before scoring. Survivors compete in the normal STAR score + runoff."
          official={officialMethod === 'ivstar'}
          candidates={tally.ivstar}
          mode="star"
          variant="iv"
          emptyNote={anyVetoedInStar ? undefined : 'No games vetoed — same result as STAR.'}
        />
      </div>

      <div class="method-pair">
        <MethodCard
          methodKey="mj"
          title="Majority Judgment"
          wikiUrl="https://en.wikipedia.org/wiki/Majority_judgment"
          description="Each game's median grade wins. Ties broken by how resilient that median is to being moved — resistant to strategic voting."
          official={officialMethod === 'mj'}
          candidates={tally.mj}
          mode="mj"
        />
        <MethodCard
          methodKey="ivmj"
          title="IV · Majority Judgment"
          description="Games with more Hard Passes than the least-vetoed game are disqualified first, then MJ ranks the survivors."
          official={officialMethod === 'ivmj'}
          candidates={tally.ivmj}
          mode="mj"
          variant="iv"
          emptyNote={anyVetoedInMJ ? undefined : 'No games vetoed — same result as MJ.'}
        />
      </div>

      <div class="method-pair">
        <MethodCard
          methodKey="borda"
          title="Borda Count"
          wikiUrl="https://en.wikipedia.org/wiki/Borda_count"
          description="Each voter ranks all games. Points are awarded by rank (top = N−1 pts, bottom = 0 pts). Tied grades split the points evenly. Highest total wins."
          official={officialMethod === 'borda'}
          candidates={tally.borda}
          mode="borda"
        />
        <MethodCard
          methodKey="irv"
          title="Instant Runoff (IRV)"
          wikiUrl="https://en.wikipedia.org/wiki/Instant-runoff_voting"
          description="Voters' top remaining choice gets their vote each round. The last-place game is eliminated and votes redistribute — until one game holds a majority."
          official={officialMethod === 'irv'}
          candidates={tally.irv}
          mode="irv"
        />
      </div>

      <div class="method-pair">
        <MethodCard
          methodKey="condorcet"
          title="Condorcet"
          wikiUrl="https://en.wikipedia.org/wiki/Condorcet_method"
          description="Every game fights every other game head-to-head. The game that beats all others wins. If there's a rock-paper-scissors cycle… nobody wins. 🔄"
          official={officialMethod === 'condorcet'}
          candidates={tally.condorcet}
          mode="condorcet"
          condorcetParadox={tally.condorcetParadox}
        />
        <MethodCard
          methodKey="dictator"
          title="Dictator"
          description="Democracy is cancelled. The last person to vote picks everything. Bars show what everyone wanted — ranking shows what the dictator gets."
          official={officialMethod === 'dictator'}
          candidates={tally.dictator}
          mode="dictator"
          variant="dictator"
          dictatorName={tally.dictatorName}
        />
      </div>
    </div>
  {/if}

  <div class="actions">
    {#if isMock}
      <a href="/" class="btn btn-ghost">← Back to Home</a>
    {:else}
      <a href="/vote/{tally.ballotId}" class="btn btn-primary">
        {hasVoted ? 'Change Your Vote' : 'Cast Your Vote'} →
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

  .actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }
</style>
