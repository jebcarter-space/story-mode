<script lang="ts">
  import { link } from 'svelte-routing';
  import { createLibrary } from '../../data/models/library.svelte';
  import Breadcrumb from '../ui/Breadcrumb.svelte';
  import ImageUploader from '../ui/ImageUploader.svelte';
  import { setRepositoryContext } from '../../lib/repository-context';
  import type { ImageUploadResult } from '../../lib/image-handler';

  const library = createLibrary();

  const breadcrumbItems = [
    { label: 'Home', path: '/' },
    { label: 'Library', path: '/library' }
  ];

  let showCreateShelf = $state(false);
  let newShelfName = $state('');
  let newShelfBanner = $state('');

  async function createShelf() {
    if (newShelfName.trim()) {
      await library.createShelf(newShelfName.trim(), newShelfBanner.trim() || undefined);
      cancelCreate();
    }
  }

  function cancelCreate() {
    newShelfName = '';
    newShelfBanner = '';
    showCreateShelf = false;
  }

  function handleBannerUpload(result: ImageUploadResult | null) {
    newShelfBanner = result?.url || '';
  }

  // Get continue book info
  const continueBookPath = $derived(library.isLoaded ? library.getContinueBookPath() : '/library');
  const hasBooksToRead = $derived(() => {
    if (!library.isLoaded || !library.value) return false;
    return Object.values(library.value.shelves).some(shelf => 
      Object.keys(shelf.books).length > 0
    );
  });

  // Set repository context for library level
  $effect(() => {
    setRepositoryContext({
      shelfId: undefined,
      bookId: undefined,
      chapterId: undefined
    });
  });

  // Function to populate test data (for testing/development)
  async function populateWithTestData() {
    await library.populateTestData();
  }
</script>

<div class="library-page p-4">
  <Breadcrumb items={breadcrumbItems} />
  
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Your Library</h1>
    <div class="flex gap-3">
      {#if hasBooksToRead()}
        <a
          href={continueBookPath}
          use:link
          style="background-color: var(--theme-primary, #22c55e); color: white;"
          class="px-6 py-3 rounded-lg transition-colors font-medium shadow-md flex items-center gap-2 hover:opacity-90"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
          </svg>
          Continue Reading
        </a>
      {/if}
      
      <!-- Temporary test data button -->
      {#if Object.keys(library.value?.shelves || {}).length <= 1}
        <button
          onclick={populateWithTestData}
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          Add Test Data
        </button>
      {/if}
      
      <button
        onclick={() => showCreateShelf = true}
        style="background-color: var(--theme-secondary, #3b82f6); color: white;"
        class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 hover:opacity-90"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        New Shelf
      </button>
    </div>
  </div>

  {#if !library.isLoaded}
    <div class="flex items-center justify-center py-12">
      <div class="text-lg text-gray-600 dark:text-gray-400">Loading library...</div>
    </div>
  {:else if library.value}
    <!-- Shelves Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each Object.entries(library.value.shelves) as [shelfId, shelf] (shelfId)}
        <a 
          href="/library/{shelfId}" 
          use:link
          class="shelf-card bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 p-6 block"
        >
          {#if shelf.bannerImage}
            <div class="w-full h-32 mb-4 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <img src={shelf.bannerImage} alt={shelf.name} class="w-full h-full object-cover" />
            </div>
          {:else}
            <div class="w-full h-32 mb-4 rounded flex items-center justify-center" style="background: var(--theme-tertiary, linear-gradient(to bottom right, #dbeafe, #bfdbfe)); color: var(--theme-tertiary, #2563eb);">
              <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10.496 2.132a1 1 0 00-.992 0l-7 4A1 1 0 003 8v7a1 1 0 100 2h14a1 1 0 100-2V8a1 1 0 00.496-1.868l-7-4zM6 9a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
          {/if}
          
          <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {shelf.name}
          </h3>
          
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            {Object.keys(shelf.books).length} book{Object.keys(shelf.books).length !== 1 ? 's' : ''}
          </p>
          
          <p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Updated {new Date(shelf.updatedAt).toLocaleDateString()}
          </p>
        </a>
      {/each}
    </div>

    {#if Object.keys(library.value.shelves).length === 1 && Object.keys(library.value.shelves.default.books).length === 0}
      <div class="text-center py-12">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10.496 2.132a1 1 0 00-.992 0l-7 4A1 1 0 003 8v7a1 1 0 100 2h14a1 1 0 100-2V8a1 1 0 00.496-1.868l-7-4zM6 9a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Your library is empty</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">Create your first shelf to organize your stories</p>
        <button
          onclick={() => showCreateShelf = true}
          style="background-color: var(--theme-secondary, #3b82f6); color: white;"
          class="px-6 py-3 rounded-lg transition-colors hover:opacity-90"
        >
          Create Your First Shelf
        </button>
      </div>
    {/if}
  {/if}

  <!-- Create Shelf Modal -->
  {#if showCreateShelf}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Shelf</h2>
          <button
            onclick={cancelCreate}
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close dialog"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-6">
          <div>
            <label for="shelf-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shelf Name *
            </label>
            <input
              id="shelf-name"
              bind:value={newShelfName}
              type="text"
              placeholder="e.g., Fantasy Adventures"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              autofocus
            />
          </div>
          
          <ImageUploader
            label="Banner Image (optional)"
            value={newShelfBanner}
            onChange={handleBannerUpload}
            previewSize="medium"
            placeholder="Upload a banner image for your shelf..."
          />
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            onclick={cancelCreate}
            class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            onclick={createShelf}
            disabled={!newShelfName.trim()}
            style="background-color: var(--theme-secondary, #3b82f6); color: white;"
            class="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            Create Shelf
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .shelf-card:hover {
    transform: translateY(-1px);
  }
</style>