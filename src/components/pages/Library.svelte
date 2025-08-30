<script lang="ts">
  import { link } from 'svelte-routing';
  import { createLibrary } from '../../data/models/library.svelte';
  import Breadcrumb from '../ui/Breadcrumb.svelte';

  const library = createLibrary();

  const breadcrumbItems = [
    { label: 'Library', path: '/library' }
  ];

  let showCreateShelf = $state(false);
  let newShelfName = $state('');
  let newShelfBanner = $state('');

  async function createShelf() {
    if (newShelfName.trim()) {
      await library.createShelf(newShelfName.trim(), newShelfBanner.trim() || undefined);
      newShelfName = '';
      newShelfBanner = '';
      showCreateShelf = false;
    }
  }

  function cancelCreate() {
    newShelfName = '';
    newShelfBanner = '';
    showCreateShelf = false;
  }
</script>

<div class="library-page p-4">
  <Breadcrumb items={breadcrumbItems} />
  
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Your Library</h1>
    <button
      onclick={() => showCreateShelf = true}
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      + New Shelf
    </button>
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
            <div class="w-full h-32 mb-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded flex items-center justify-center">
              <svg class="w-12 h-12 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
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
      
      <!-- Continue Reading Button -->
      {#if Object.values(library.value.shelves).some(shelf => Object.keys(shelf.books).length > 0)}
        <div class="shelf-card bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-green-300 dark:border-green-700 p-6">
          <div class="w-full h-32 mb-4 flex items-center justify-center">
            <svg class="w-16 h-16 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
            </svg>
          </div>
          
          <h3 class="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
            Continue Reading
          </h3>
          
          <p class="text-green-700 dark:text-green-300 text-sm mb-4">
            Jump back into your latest story
          </p>
          
          <a 
            href={library.getContinueBookPath()} 
            use:link
            class="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Continue →
          </a>
        </div>
      {/if}
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
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Your First Shelf
        </button>
      </div>
    {/if}
  {/if}

  <!-- Create Shelf Modal -->
  {#if showCreateShelf}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Shelf</h2>
        
        <div class="space-y-4">
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
          
          <div>
            <label for="shelf-banner" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Banner Image URL (optional)
            </label>
            <input
              id="shelf-banner"
              bind:value={newShelfBanner}
              type="url"
              placeholder="https://example.com/banner.jpg"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
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
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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