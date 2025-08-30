<script lang="ts">
  import type { RepositoryItem, RepositoryCategory, RepositoryList, RepositoryViews } from '../../data/types';
  import { createRepositories } from '../../data/models/repositories.svelte.ts';
  import { RepositoryImporter } from '../../lib/repository-importer';

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

  let categoryItems = $derived(repositories.getByCategory(category));
  let filteredItems = $derived(() => {
    const items = Object.entries(categoryItems);
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
    view = 'create';
    showModal = true;
  }

  function resetForm() {
    formName = '';
    formDescription = '';
    formContent = '';
    formKeywords = '';
    formForceInContext = false;
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
      updated: Date.now()
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
  <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b">
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
        class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        title="Toggle view"
      >
        {view === 'view' ? '−' : '⋯'}
      </button>
    </div>
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
                  <p class="text-xs text-gray-600 dark:text-gray-400 truncate">{item.description}</p>
                {/if}
                {#if item.keywords.length > 0}
                  <div class="flex gap-1 flex-wrap mt-1">
                    {#each item.keywords as keyword}
                      <span class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{keyword}</span>
                    {/each}
                  </div>
                {/if}
              </div>
              <div class="flex gap-1">
                <button
                  onclick={() => toggleForceInContext(key, item)}
                  class="text-xs px-1 py-1 {item.forceInContext ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-600'} rounded"
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
          <div class="text-xs text-gray-500 text-center py-4">
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
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full m-4 max-h-screen overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium">
          {editingItem ? 'Edit' : 'Add'} {category}
        </h3>
        <button
          onclick={closeModal}
          class="text-gray-500 hover:text-gray-700"
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
          <p class="text-xs text-gray-500 mt-1">
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
          <p class="text-xs text-gray-500 mt-1">
            Always include this item in LLM context regardless of keyword matches
          </p>
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
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}