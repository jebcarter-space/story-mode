<script lang="ts">
  import type { RepositoryItem, RepositoryCategory, RepositoryList, RepositoryViews } from '../../data/types';
  import { createRepositories } from '../../data/models/repositories.svelte.ts';
  import { RepositoryImporter } from '../../lib/repository-importer';
  import ContextIndicator from '../ui/ContextIndicator.svelte';
  import { getRepositoryContext } from '../../lib/repository-context';

  let { category }: { category: RepositoryCategory } = $props();

  const repositories = createRepositories();
  let view: RepositoryViews = $state('');
  let showModal = $state(false);
  let editingItem: RepositoryItem | null = $state(null);
  let editingKey = $state('');
  let searchTerm = $state('');
  let importError = $state('');
  let importSuccess = $state('');

  // Form state
  let formName = $state('');
  let formDescription = $state('');
  let formContent = $state('');
  let formKeywords = $state('');
  let formForceInContext = $state(false);
  // New scoping form fields
  let formScope = $state<'chapter' | 'book' | 'shelf' | 'library'>('library');
  let formScopeContext = $state({ chapterId: '', bookId: '', shelfId: '' });
  let formWorkbookTags = $state('');
  let conflictWarning = $state('');
  let acknowledgeConflict = $state(false);

  // Get repository context for scoping
  let repositoryContext = $derived(getRepositoryContext());

  let categoryItems = $derived(repositories.getByCategory(category));
  let filteredItems = $derived(() => {
    // Force reactivity by accessing value directly
    const allItems = repositories.value;
    const items = Object.entries(allItems).filter(([key, item]) => item.category === category);
    if (!searchTerm) return items;
    return items.filter(([key, item]) => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  function openCreateForm() {
    resetForm();
    editingItem = null;
    editingKey = '';
    view = 'create';
    showModal = true;
  }

  function openEditForm(key: string, item: RepositoryItem) {
    editingItem = item;
    editingKey = key;
    formName = item.name;
    formDescription = item.description;
    formContent = item.content;
    formKeywords = item.keywords.join(', ');
    formForceInContext = item.forceInContext;
    // Load scoping fields
    formScope = item.scope || 'library';
    formScopeContext = {
      chapterId: item.scopeContext?.chapterId || '',
      bookId: item.scopeContext?.bookId || '',
      shelfId: item.scopeContext?.shelfId || ''
    };
    formWorkbookTags = item.workbookTags?.join(', ') || '';
    conflictWarning = '';
    acknowledgeConflict = false;
    view = 'create';
    showModal = true;
  }

  function resetForm() {
    formName = '';
    formDescription = '';
    formContent = '';
    formKeywords = '';
    formForceInContext = false;
    // Reset scoping fields with current context defaults
    if (repositoryContext.chapterId) {
      formScope = 'chapter';
      formScopeContext = {
        chapterId: repositoryContext.chapterId,
        bookId: repositoryContext.bookId || '',
        shelfId: repositoryContext.shelfId || ''
      };
    } else if (repositoryContext.bookId) {
      formScope = 'book';
      formScopeContext = {
        chapterId: '',
        bookId: repositoryContext.bookId,
        shelfId: repositoryContext.shelfId || ''
      };
    } else if (repositoryContext.shelfId) {
      formScope = 'shelf';
      formScopeContext = {
        chapterId: '',
        bookId: '',
        shelfId: repositoryContext.shelfId
      };
    } else {
      formScope = 'library';
      formScopeContext = { chapterId: '', bookId: '', shelfId: '' };
    }
    formWorkbookTags = '';
    conflictWarning = '';
    acknowledgeConflict = false;
  }

  function closeModal() {
    showModal = false;
    view = '';
    resetForm();
    editingItem = null;
    editingKey = '';
  }

  function saveItem() {
    if (!formName.trim()) return;

    const item: RepositoryItem = {
      name: formName.trim(),
      description: formDescription.trim(),
      content: formContent.trim(),
      keywords: formKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0),
      forceInContext: formForceInContext,
      category,
      created: editingItem?.created || Date.now(),
      updated: Date.now(),
      // Add scoping fields
      scope: formScope,
      scopeContext: {
        chapterId: formScopeContext.chapterId || undefined,
        bookId: formScopeContext.bookId || undefined,
        shelfId: formScopeContext.shelfId || undefined
      },
      workbookTags: formWorkbookTags.split(',').map(t => t.trim()).filter(t => t.length > 0)
    };

    if (editingItem && editingKey) {
      repositories.update(editingKey, item);
    } else {
      repositories.add(item);
    }

    closeModal();
  }

  function deleteItem(key: string) {
    if (confirm('Are you sure you want to delete this repository item?')) {
      repositories.remove(key);
    }
  }

  function toggleForceInContext(key: string, item: RepositoryItem) {
    const updated = { ...item, forceInContext: !item.forceInContext, updated: Date.now() };
    repositories.update(key, updated);
  }

  async function handleFileImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importError = '';
    importSuccess = '';

    try {
      const result = await RepositoryImporter.importFromFile(file);
      if (result.success && result.repositories) {
        // Filter to only import items of the current category
        const categoryItems: RepositoryList = {};
        for (const [key, item] of Object.entries(result.repositories)) {
          if (item.category === category) {
            categoryItems[key] = item;
          }
        }
        
        if (Object.keys(categoryItems).length > 0) {
          repositories.importRepositories(categoryItems);
          importSuccess = `Successfully imported ${Object.keys(categoryItems).length} ${category.toLowerCase()} items`;
          if (result.warnings && result.warnings.length > 0) {
            importSuccess += ` (with ${result.warnings.length} warnings)`;
          }
        } else {
          importError = `No ${category.toLowerCase()} items found in the imported file`;
        }
      } else {
        importError = result.error || 'Import failed';
      }
    } catch (error) {
      importError = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    input.value = '';
  }

  function exportItems() {
    const items = repositories.getByCategory(category);
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category.toLowerCase()}-repository.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<div class="border rounded-lg">
  <!-- Header -->
  <div class="flex items-center justify-between p-3 theme-bg-muted theme-border border-b">
    <h3 class="font-medium">{category} Repository</h3>
    <div class="flex gap-2">
      <button 
        onclick={openCreateForm}
        class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        title="Add {category}"
      >
        +
      </button>
      <button
        onclick={() => view = view === 'view' ? '' : 'view'}
        class="text-xs px-2 py-1 rounded hover:opacity-80"
        style="background-color: var(--theme-button); color: var(--theme-foreground);"
        title="Toggle view"
      >
        {view === 'view' ? '−' : '⋯'}
      </button>
    </div>
  </div>

  <!-- Context Indicator -->
  <div class="p-2 border-b theme-border">
    <ContextIndicator context={repositoryContext} compact={true} />
  </div>

  <!-- Content -->
  {#if view === 'view'}
    <div class="p-3 space-y-3">
      <!-- Search and Actions -->
      <div class="flex gap-2 items-center">
        <input
          bind:value={searchTerm}
          placeholder="Search {category.toLowerCase()}s..."
          class="flex-1 text-xs px-2 py-1 border rounded"
        />
        <input
          type="file"
          accept=".json"
          onchange={handleFileImport}
          class="hidden"
          id="import-{category.toLowerCase()}"
        />
        <label
          for="import-{category.toLowerCase()}"
          class="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer"
          title="Import {category.toLowerCase()}s"
        >
          Import
        </label>
        <button
          onclick={exportItems}
          class="text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
          title="Export {category.toLowerCase()}s"
        >
          Export
        </button>
      </div>

      <!-- Import feedback -->
      {#if importError}
        <div class="text-xs text-red-600 bg-red-50 p-2 rounded border">{importError}</div>
      {/if}
      {#if importSuccess}
        <div class="text-xs text-green-600 bg-green-50 p-2 rounded border">{importSuccess}</div>
      {/if}

      <!-- Items list -->
      <div class="space-y-2 max-h-60 overflow-y-auto">
        {#each filteredItems as [key, item]}
          <div class="border rounded p-2 space-y-1">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-medium truncate">{item.name}</h4>
                  {#if item.forceInContext}
                    <span class="text-xs bg-orange-100 text-orange-800 px-1 rounded" title="Forced in context">!</span>
                  {/if}
                </div>
                {#if item.description}
                  <p class="text-xs theme-text-muted truncate">{item.description}</p>
                {/if}
                {#if item.keywords.length > 0}
                  <div class="flex gap-1 flex-wrap mt-1">
                    {#each item.keywords as keyword}
                      <span class="text-xs px-1 rounded" style="background-color: var(--theme-muted); color: var(--theme-foreground);">{keyword}</span>
                    {/each}
                  </div>
                {/if}
              </div>
              <div class="flex gap-1">
                <button
                  onclick={() => toggleForceInContext(key, item)}
                  class="text-xs px-1 py-1 rounded"
                  style="background-color: {item.forceInContext ? '#fef3c7' : 'var(--theme-button)'}; color: {item.forceInContext ? '#92400e' : 'var(--theme-foreground)'};"
                  title="Toggle force in context"
                >
                  !
                </button>
                <button
                  onclick={() => openEditForm(key, item)}
                  class="text-xs px-1 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onclick={() => deleteItem(key)}
                  class="text-xs px-1 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        {:else}
          <div class="text-xs theme-text-muted text-center py-4">
            No {category.toLowerCase()}s found
            {#if searchTerm}
              for "{searchTerm}"
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Modal -->
{#if showModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="theme-bg-main rounded-lg p-6 w-96 max-w-full m-4 max-h-screen overflow-y-auto" style="border: 1px solid var(--theme-border);">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium">
          {editingItem ? 'Edit' : 'Add'} {category}
        </h3>
        <button
          onclick={closeModal}
          class="theme-text-muted hover:opacity-70">
        >
          ×
        </button>
      </div>

      <form onsubmit={(e) => {e.preventDefault(); saveItem();}} class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Name *</label>
          <input
            bind:value={formName}
            required
            class="w-full px-3 py-2 border rounded"
            placeholder="{category} name"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Description</label>
          <input
            bind:value={formDescription}
            class="w-full px-3 py-2 border rounded"
            placeholder="Brief description"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Content *</label>
          <textarea
            bind:value={formContent}
            required
            rows="4"
            class="w-full px-3 py-2 border rounded"
            placeholder="Detailed content for LLM context"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Keywords</label>
          <input
            bind:value={formKeywords}
            class="w-full px-3 py-2 border rounded"
            placeholder="keyword1, keyword2, phrase with spaces"
          />
          <p class="text-xs theme-text-muted mt-1">
            Comma-separated keywords for pattern matching
          </p>
        </div>

        <div>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={formForceInContext}
            />
            <span class="text-sm">Force in LLM context</span>
          </label>
          <p class="text-xs theme-text-muted mt-1">
            Always include this item in LLM context regardless of keyword matches
          </p>
        </div>

        <!-- Repository Scoping Controls -->
        <div class="border-t pt-4 mt-4">
          <h4 class="text-sm font-medium mb-3">Repository Scope</h4>
          
          <div>
            <label class="block text-sm font-medium mb-1">Scope Level</label>
            <select
              bind:value={formScope}
              class="w-full px-3 py-2 border rounded"
            >
              <option value="library">Library-level (available everywhere)</option>
              <option value="shelf">Shelf-level (available in all books on shelf)</option>
              <option value="book">Book-level (available in all chapters of book)</option>
              <option value="chapter">Chapter-level (available only in specific chapter)</option>
            </select>
          </div>

          {#if formScope !== 'library'}
            <div class="mt-3 space-y-2">
              {#if formScope === 'shelf' || formScope === 'book' || formScope === 'chapter'}
                <div>
                  <label class="block text-sm font-medium mb-1">Shelf ID</label>
                  <input
                    bind:value={formScopeContext.shelfId}
                    class="w-full px-3 py-2 border rounded text-sm"
                    placeholder="Enter shelf identifier"
                  />
                </div>
              {/if}
              
              {#if formScope === 'book' || formScope === 'chapter'}
                <div>
                  <label class="block text-sm font-medium mb-1">Book ID</label>
                  <input
                    bind:value={formScopeContext.bookId}
                    class="w-full px-3 py-2 border rounded text-sm"
                    placeholder="Enter book identifier"
                  />
                </div>
              {/if}
              
              {#if formScope === 'chapter'}
                <div>
                  <label class="block text-sm font-medium mb-1">Chapter ID</label>
                  <input
                    bind:value={formScopeContext.chapterId}
                    class="w-full px-3 py-2 border rounded text-sm"
                    placeholder="Enter chapter identifier"
                  />
                </div>
              {/if}
            </div>
          {/if}

          <div class="mt-3">
            <label class="block text-sm font-medium mb-1">Workbook Tags</label>
            <input
              bind:value={formWorkbookTags}
              class="w-full px-3 py-2 border rounded"
              placeholder="tag1, tag2, locations"
            />
            <p class="text-xs theme-text-muted mt-1">
              Comma-separated tags for workbook organization
            </p>
          </div>

          {#if conflictWarning}
            <div class="mt-3 p-3 bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded">
              <div class="flex items-start gap-2">
                <span class="text-orange-600 dark:text-orange-400">⚠️</span>
                <div class="flex-1">
                  <p class="text-sm text-orange-800 dark:text-orange-200 font-medium">Keyword collision detected</p>
                  <p class="text-xs text-orange-700 dark:text-orange-300 mt-1">{conflictWarning}</p>
                  <label class="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      bind:checked={acknowledgeConflict}
                      class="text-orange-600"
                    />
                    <span class="text-xs text-orange-800 dark:text-orange-200">I understand (silence this warning)</span>
                  </label>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <div class="flex gap-2 pt-4">
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {editingItem ? 'Update' : 'Add'} {category}
          </button>
          <button
            type="button"
            onclick={closeModal}
            class="px-4 py-2 rounded hover:opacity-80"
            style="background-color: var(--theme-button); color: var(--theme-foreground);"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}