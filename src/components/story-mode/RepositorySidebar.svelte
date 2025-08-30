<script lang="ts">
  import RepositoryPanel from './RepositoryPanel.svelte';
  
  let showRepositories = $state(false);
</script>

<!-- Toggle Button -->
<button
  onclick={() => showRepositories = !showRepositories}
  class="px-3 py-2 rounded hover:opacity-80 transition-colors"
  style="background-color: var(--theme-button); color: var(--theme-foreground);"
  title="Toggle Repository Storage"
>
  📚 Repository
</button>

<!-- Repository Sidebar -->
{#if showRepositories}
  <div class="fixed right-0 top-0 h-full w-80 theme-bg-main border-l shadow-lg z-40 overflow-y-auto" style="border-color: var(--theme-border);">
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold theme-text-main">Story Repository</h2>
        <button
          onclick={() => showRepositories = false}
          class="theme-text-muted hover:opacity-70 text-xl"
          title="Close Repository"
        >
          ×
        </button>
      </div>

      <!-- Repository Panels -->
      <div class="space-y-4">
        <RepositoryPanel category="Character" />
        <RepositoryPanel category="Location" />
        <RepositoryPanel category="Object" />
        <RepositoryPanel category="Situation" />
      </div>

      <!-- Help Text -->
      <div class="mt-6 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg text-sm">
        <h4 class="font-medium mb-2">How to Use:</h4>
        <ul class="space-y-1 text-xs theme-text-muted">
          <li>• Add items manually to each repository category</li>
          <li>• Use keywords for pattern matching in story content</li>
          <li>• Toggle "Force in context" for persistent LLM inclusion</li>
          <li>• Import/export JSON files to share repositories</li>
        </ul>
      </div>
    </div>
  </div>
{/if}

<!-- Backdrop -->
{#if showRepositories}
  <div 
    class="fixed inset-0 bg-black bg-opacity-25 z-30"
    role="button"
    tabindex="0"
    onclick={() => showRepositories = false}
    onkeydown={(e) => e.key === 'Escape' && (showRepositories = false)}
    aria-label="Close repository sidebar"
  ></div>
{/if}