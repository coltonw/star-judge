<script lang="ts">
  import '../app.css'
  import type { LayoutData } from './$types'

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props()
</script>

<svelte:head>
  <title>Star Judge</title>
</svelte:head>

<nav>
  <a class="logo" href="/">
    <img src="/logo.png" alt="" class="logo-img" />
    Star Judge
  </a>
  <a href="/">Home</a>
  {#if data.isAdmin}
    <a href="/admin">Admin</a>
  {/if}
</nav>

<main class="container">
  {@render children()}
</main>
