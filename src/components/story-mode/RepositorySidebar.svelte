<script lang="ts">
  import RepositoryPanel from './RepositoryPanel.svelte';
  
  let showRepositories = $state(false);
</script>

<!-- Toggle Button -->
<button
  onclick={() => showRepositories = !showRepositories}
  class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
  title="Toggle Repository Storage"
>
  📚 Repository
</button>

<!-- Repository Sidebar -->
{#if showRepositories}
  <div class="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-l shadow-lg z-40 overflow-y-auto">
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Story Repository</h2>
        <button
          onclick={() => showRepositories = false}
          class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
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
        <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-300">
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