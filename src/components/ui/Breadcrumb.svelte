<script lang="ts">
  import { link } from 'svelte-routing';

  interface BreadcrumbItem {
    label: string;
    path: string;
  }

  let { items = [] }: { items: BreadcrumbItem[] } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="Breadcrumb">
  <ol class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
    {#each items as item, index (item.path)}
      <li class="flex items-center">
        {#if index > 0}
          <svg class="w-3 h-3 mx-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        {/if}
        
        {#if index === items.length - 1}
          <!-- Current page - not a link -->
          <span class="font-medium text-gray-900 dark:text-gray-100" aria-current="page">
            {item.label}
          </span>
        {:else}
          <!-- Link to parent pages -->
          <a 
            href={item.path} 
            use:link
            class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {item.label}
          </a>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .breadcrumb {
    /* Additional styles if needed */
  }
</style>