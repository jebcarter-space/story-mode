<script lang="ts">
  import RepositoryPanel from './RepositoryPanel.svelte';
  import WorkbookStack from '../ui/WorkbookStack.svelte';
  
  let showRepositories = $state(false);
  let activeTab = $state<'repositories' | 'workbooks'>('repositories');
  
  // Get current context from URL
  let currentContext = $derived((() => {
    const path = window.location.hash.slice(2); // Remove '#/'
    const parts = path.split('/');
    
    if (parts[0] === 'library' && parts.length >= 2) {
      const context: { shelfId?: string; bookId?: string; chapterId?: string } = {};
      
      if (parts[1]) context.shelfId = parts[1];
      if (parts[2]) context.bookId = parts[2];
      if (parts[3]) context.chapterId = parts[3];
      
      return context;
    }
    
    return {};
  })());
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
  <div class="fixed right-0 top-0 h-full w-96 theme-bg-main border-l shadow-lg z-40 overflow-y-auto" style="border-color: var(--theme-border);">
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

      <!-- Tab Navigation -->
      <div class="flex mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onclick={() => activeTab = 'repositories'}
          class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'repositories' 
            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
        >
          📋 Items
        </button>
        <button
          onclick={() => activeTab = 'workbooks'}
          class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'workbooks' 
            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}"
        >
          📚 Workbooks
        </button>
      </div>

      <!-- Tab Content -->
      {#if activeTab === 'repositories'}
        <!-- Repository Panels -->
        <div class="space-y-4">
          <RepositoryPanel category="Character" />
          <RepositoryPanel category="Location" />
          <RepositoryPanel category="Object" />
          <RepositoryPanel category="Situation" />
        </div>

        <!-- Help Text -->
        <div class="mt-6 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg text-sm">
          <h4 class="font-medium mb-2">Repository System:</h4>
          <ul class="space-y-1 text-xs theme-text-muted">
            <li>• Add items with scoped availability (Library/Shelf/Book/Chapter)</li>
            <li>• Use keywords for pattern matching in story content</li>
            <li>• Tag items for workbook organization</li>
            <li>• Import/export JSON files to share repositories</li>
          </ul>
        </div>
      {:else}
        <!-- Workbook Management -->
        <WorkbookStack {currentContext} />
        
        <!-- Help Text -->
        <div class="mt-6 p-3 bg-purple-50 dark:bg-purple-900 rounded-lg text-sm">
          <h4 class="font-medium mb-2">Workbook System:</h4>
          <ul class="space-y-1 text-xs theme-text-muted">
            <li>• Organize repository items in workbook collections</li>
            <li>• Set master scope overrides for entire workbooks</li>
            <li>• Use tags to group related items across categories</li>
            <li>• Auto-created workbooks when shelves are created</li>
          </ul>
        </div>
      {/if}
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