<script lang="ts">
  import '../app.css'
  import { page } from '$app/state'

  let { children } = $props()

  let isAdmin = $derived(page.url.pathname.startsWith('/admin'))
</script>

<svelte:head>
  <title>Star Judge</title>
</svelte:head>

<nav>
  <a class="logo" href="/">⚖️ Star Judge</a>
  <a href="/">Vote</a>
  {#if isAdmin}
    <a href="/admin">Admin</a>
  {/if}
</nav>

<main class="container">
  {@render children()}
</main>
