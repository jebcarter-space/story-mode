<script lang="ts">
  import type { Stack, Workbook } from '../../data/types';
  import { createWorkbooks } from '../../data/models/workbooks.svelte';
  
  let { 
    currentContext = {} 
  }: { 
    currentContext?: { chapterId?: string; bookId?: string; shelfId?: string } 
  } = $props();

  const workbooks = createWorkbooks();
  
  let showCreateStack = $state(false);
  let showCreateWorkbook = $state(false);
  let selectedStackId = $state('');
  let newStackName = $state('');
  let newWorkbookName = $state('');
  let newWorkbookDescription = $state('');
  let newWorkbookTags = $state('');
  let newWorkbookMasterScope = $state<'chapter' | 'book' | 'shelf' | 'library' | ''>('');
  
  let stacks = $derived(Object.values(workbooks.value.stacks));
  
  function startCreateStack() {
    newStackName = '';
    showCreateStack = true;
  }
  
  function startCreateWorkbook(stackId: string) {
    selectedStackId = stackId;
    newWorkbookName = '';
    newWorkbookDescription = '';
    newWorkbookTags = '';
    newWorkbookMasterScope = '';
    showCreateWorkbook = true;
  }
  
  function cancelCreateStack() {
    showCreateStack = false;
    newStackName = '';
  }
  
  function cancelCreateWorkbook() {
    showCreateWorkbook = false;
    selectedStackId = '';
    newWorkbookName = '';
    newWorkbookDescription = '';
    newWorkbookTags = '';
    newWorkbookMasterScope = '';
  }
  
  async function createStack() {
    if (newStackName.trim()) {
      workbooks.createStack(newStackName.trim());
      cancelCreateStack();
    }
  }
  
  async function createWorkbook() {
    if (newWorkbookName.trim() && selectedStackId) {
      const tags = newWorkbookTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const masterScope = newWorkbookMasterScope || undefined;
      const masterScopeContext = masterScope ? currentContext : undefined;
      
      workbooks.createWorkbook(
        selectedStackId,
        newWorkbookName.trim(),
        newWorkbookDescription.trim() || undefined,
        tags,
        masterScope as any,
        masterScopeContext
      );
      
      cancelCreateWorkbook();
    }
  }
  
  function deleteStack(stackId: string) {
    if (confirm('Are you sure you want to delete this stack and all its workbooks?')) {
      workbooks.deleteStack(stackId);
    }
  }
  
  function deleteWorkbook(stackId: string, workbookId: string) {
    if (confirm('Are you sure you want to delete this workbook?')) {
      workbooks.deleteWorkbook(stackId, workbookId);
    }
  }
  
  function getScopeDisplayName(scope: string): string {
    switch(scope) {
      case 'chapter': return 'Chapter';
      case 'book': return 'Book';
      case 'shelf': return 'Shelf';
      case 'library': return 'Library';
      default: return 'None';
    }
  }
  
  function isWorkbookInCurrentScope(workbook: Workbook): boolean {
    if (!workbook.masterScope || !workbook.masterScopeContext) return true;
    
    const ctx = workbook.masterScopeContext;
    switch(workbook.masterScope) {
      case 'chapter':
        return ctx.chapterId === currentContext.chapterId &&
               ctx.bookId === currentContext.bookId &&
               ctx.shelfId === currentContext.shelfId;
      case 'book':
        return ctx.bookId === currentContext.bookId &&
               ctx.shelfId === currentContext.shelfId;
      case 'shelf':
        return ctx.shelfId === currentContext.shelfId;
      case 'library':
      default:
        return true;
    }
  }
</script>

<div class="workbook-stacks p-4">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold theme-text-main">📚 Workbook Stacks</h3>
    <button
      onclick={startCreateStack}
      class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
    >
      + New Stack
    </button>
  </div>
  
  <!-- Context Indicator -->
  {#if currentContext.chapterId || currentContext.bookId || currentContext.shelfId}
    <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
      <p class="text-sm font-medium text-blue-800 dark:text-blue-200">Current Context:</p>
      <p class="text-xs text-blue-700 dark:text-blue-300">
        {#if currentContext.shelfId}Shelf: {currentContext.shelfId}{/if}
        {#if currentContext.bookId} → Book: {currentContext.bookId}{/if}
        {#if currentContext.chapterId} → Chapter: {currentContext.chapterId}{/if}
      </p>
    </div>
  {/if}

  <!-- Stacks List -->
  {#if stacks.length > 0}
    <div class="space-y-4">
      {#each stacks as stack (stack.id)}
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg">
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800">
            <h4 class="font-medium theme-text-main">📖 {stack.name}</h4>
            <div class="flex gap-2">
              <button
                onclick={() => startCreateWorkbook(stack.id)}
                class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Workbook
              </button>
              <button
                onclick={() => deleteStack(stack.id)}
                class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
          
          <!-- Workbooks in Stack -->
          <div class="p-3 space-y-2">
            {#if Object.keys(stack.workbooks).length > 0}
              {#each Object.values(stack.workbooks) as workbook (workbook.id)}
                <div class="flex items-center justify-between p-2 border border-gray-100 dark:border-gray-600 rounded">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm theme-text-main">{workbook.name}</span>
                      {#if workbook.masterScope}
                        <span class="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                          {getScopeDisplayName(workbook.masterScope)} Scope
                        </span>
                      {/if}
                      {#if !isWorkbookInCurrentScope(workbook)}
                        <span class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          Out of scope
                        </span>
                      {:else}
                        <span class="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                          Active
                        </span>
                      {/if}
                    </div>
                    {#if workbook.description}
                      <p class="text-xs theme-text-muted mt-1">{workbook.description}</p>
                    {/if}
                    {#if workbook.tags.length > 0}
                      <div class="flex gap-1 mt-1">
                        {#each workbook.tags as tag}
                          <span class="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                            {tag}
                          </span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  <button
                    onclick={() => deleteWorkbook(stack.id, workbook.id)}
                    class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 ml-2"
                  >
                    Delete
                  </button>
                </div>
              {/each}
            {:else}
              <p class="text-sm theme-text-muted italic">No workbooks in this stack</p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center py-8">
      <p class="text-gray-600 dark:text-gray-400 mb-4">No workbook stacks created yet</p>
      <button
        onclick={startCreateStack}
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Create Your First Stack
      </button>
    </div>
  {/if}

  <!-- Create Stack Modal -->
  {#if showCreateStack}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 class="text-xl font-semibold theme-text-main mb-4">Create New Stack</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium theme-text-main mb-1">Stack Name *</label>
            <input
              bind:value={newStackName}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 theme-text-main"
              placeholder="Enter stack name"
              autofocus
            />
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            onclick={cancelCreateStack}
            class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            onclick={createStack}
            disabled={!newStackName.trim()}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Stack
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Create Workbook Modal -->
  {#if showCreateWorkbook}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
        <h2 class="text-xl font-semibold theme-text-main mb-4">Create New Workbook</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium theme-text-main mb-1">Workbook Name *</label>
            <input
              bind:value={newWorkbookName}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 theme-text-main"
              placeholder="Enter workbook name"
              autofocus
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium theme-text-main mb-1">Description</label>
            <input
              bind:value={newWorkbookDescription}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 theme-text-main"
              placeholder="Optional description"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium theme-text-main mb-1">Tags</label>
            <input
              bind:value={newWorkbookTags}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 theme-text-main"
              placeholder="tag1, tag2, locations"
            />
            <p class="text-xs theme-text-muted mt-1">Comma-separated tags</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium theme-text-main mb-1">Master Scope (Optional)</label>
            <select
              bind:value={newWorkbookMasterScope}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 theme-text-main"
            >
              <option value="">No master scope override</option>
              <option value="library">Library-level</option>
              <option value="shelf">Shelf-level</option>
              <option value="book">Book-level</option>
              <option value="chapter">Chapter-level</option>
            </select>
            <p class="text-xs theme-text-muted mt-1">Override individual item scopes for all items in this workbook</p>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            onclick={cancelCreateWorkbook}
            class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            onclick={createWorkbook}
            disabled={!newWorkbookName.trim()}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Workbook
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .workbook-stacks {
    max-height: 600px;
    overflow-y: auto;
  }
</style>