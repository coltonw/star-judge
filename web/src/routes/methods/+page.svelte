<script lang="ts">
import { METHOD_INFO, METHOD_ORDER, REPO_TREE_BASE } from '$lib/methods';
</script>

<svelte:head>
  <title>Voting Methods — Star Judge</title>
</svelte:head>

<div class="page-header">
  <h1>Voting methods</h1>
  <p class="lead">
    Every ballot on Star Judge is tallied by all eight methods at once. Here's how each one decides — and where they disagree with each other.
  </p>
</div>

<div class="method-list">
  {#each METHOD_ORDER as key}
    {@const info = METHOD_INFO[key]}
    <article class="method card">
      <header class="method-header">
        <h2 id={key}>
          {#if info.wikiUrl}
            <a class="wiki-link" href={info.wikiUrl} target="_blank" rel="noopener">{info.label}</a>
          {:else}
            {info.label}
          {/if}
        </h2>
        <p class="tagline">{info.tagline}</p>
      </header>

      <p class="summary">{info.summary}</p>

      {#if info.tiebreak}
        <p class="tiebreak"><strong>Ties and edge cases:</strong> {info.tiebreak}</p>
      {/if}

      {#if info.scenario}
        <div class="scenario">
          <div class="scenario-head">
            <span class="scenario-label">Illustrative scenario</span>
            <a class="scenario-link" href="/tally/{info.scenario.scenarioId}">Play it →</a>
          </div>
          <h3 class="scenario-title">{info.scenario.title}</h3>
          <p class="scenario-blurb">{info.scenario.blurb}</p>
        </div>
      {/if}

      <footer class="source-footer">
        <a href="{REPO_TREE_BASE}{info.sourceFile}" target="_blank" rel="noopener" class="source-link">
          <code>{info.sourceFile}</code>
        </a>
      </footer>
    </article>
  {/each}
</div>

<div class="bottom-actions">
  <a href="/" class="btn btn-ghost">← Home</a>
</div>

<style>
  .page-header {
    margin-bottom: 1.5rem;
  }

  .lead {
    color: var(--text-muted);
    font-size: 1rem;
    max-width: 64ch;
    line-height: 1.55;
    margin-top: 0.6rem;
  }

  .method-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .method {
    padding: 1.5rem;
  }

  .method-header {
    margin-bottom: 0.9rem;
  }

  .method-header h2 {
    margin: 0;
  }

  .tagline {
    color: var(--text-muted);
    font-size: 0.92rem;
    margin-top: 0.35rem;
  }

  .summary {
    line-height: 1.6;
    margin-bottom: 0.8rem;
  }

  .tiebreak {
    color: var(--text-muted);
    font-size: 0.88rem;
    line-height: 1.55;
    margin-bottom: 1rem;
  }

  .tiebreak strong {
    color: var(--text);
  }

  .scenario {
    background: color-mix(in srgb, var(--accent-dim) 15%, var(--bg-card));
    border: 1px solid color-mix(in srgb, var(--accent-dim) 30%, var(--border));
    border-radius: 7px;
    padding: 0.9rem 1rem;
    margin-bottom: 1rem;
  }

  .scenario-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 0.4rem;
  }

  .scenario-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .scenario-link {
    font-size: 0.82rem;
    color: var(--accent);
    text-decoration: none;
  }

  .scenario-link:hover {
    text-decoration: underline;
  }

  .scenario-title {
    font-size: 1rem;
    margin: 0 0 0.25rem 0;
  }

  .scenario-blurb {
    font-size: 0.88rem;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0;
  }

  .source-footer {
    border-top: 1px solid var(--border);
    padding-top: 0.8rem;
    font-size: 0.78rem;
  }

  .source-link {
    color: var(--text-muted);
    text-decoration: none;
    font-family: var(--font-mono, ui-monospace, monospace);
  }

  .source-link:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  .source-link code {
    background: transparent;
    padding: 0;
  }

  .wiki-link {
    color: inherit;
    text-decoration: none;
  }

  .wiki-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: color-mix(in srgb, var(--text-muted) 60%, transparent);
  }

  .bottom-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }
</style>
