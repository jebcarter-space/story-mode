<script lang="ts">
  import { link } from 'svelte-routing';
  import { createLibrary } from '../../data/models/library.svelte';
  import Breadcrumb from '../ui/Breadcrumb.svelte';
  import { setRepositoryContext } from '../../lib/repository-context';

  let { shelfId }: { shelfId: string } = $props();

  const library = createLibrary();

  let shelf = $derived(library.value?.shelves[shelfId]);
  let breadcrumbItems = $derived([
    { label: 'Library', path: '/library' },
    { label: shelf?.name || 'Shelf', path: `/library/${shelfId}` }
  ]);

  let showCreateBook = $state(false);
  let newBookName = $state('');
  let newBookCover = $state('');

  async function createBook() {
    if (newBookName.trim()) {
      await library.createBook(shelfId, newBookName.trim(), newBookCover.trim() || undefined);
      newBookName = '';
      newBookCover = '';
      showCreateBook = false;
    }
  }

  function cancelCreate() {
    newBookName = '';
    newBookCover = '';
    showCreateBook = false;
  }

  // Set repository context for scoping
  $effect(() => {
    setRepositoryContext({
      shelfId,
      bookId: undefined,
      chapterId: undefined
    });
  });
</script>

{#if !library.isLoaded}
  <div class="flex items-center justify-center py-12">
    <div class="text-lg text-gray-600 dark:text-gray-400">Loading shelf...</div>
  </div>
{:else if shelf}
  <div class="shelf-page p-4">
    <Breadcrumb items={breadcrumbItems} />
    
    <!-- Shelf Header -->
    <div class="mb-8">
      {#if shelf.bannerImage}
        <div class="w-full h-48 mb-6 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          <img src={shelf.bannerImage} alt={shelf.name} class="w-full h-full object-cover" />
        </div>
      {/if}
      
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{shelf.name}</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            {Object.keys(shelf.books).length} book{Object.keys(shelf.books).length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onclick={() => showCreateBook = true}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Book
        </button>
      </div>
    </div>

    <!-- Books Grid -->
    {#if Object.keys(shelf.books).length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#each Object.entries(shelf.books) as [bookId, book] (bookId)}
          <a 
            href="/library/{shelfId}/{bookId}" 
            use:link
            class="book-card bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden block"
          >
            {#if book.coverImage}
              <div class="w-full h-48 bg-gray-200 dark:bg-gray-700">
                <img src={book.coverImage} alt={book.name} class="w-full h-full object-cover" />
              </div>
            {:else}
              <div class="w-full h-48 bg-gradient-to-br from-indigo-100 to-purple-200 dark:from-indigo-900 dark:to-purple-800 flex items-center justify-center">
                <svg class="w-16 h-16 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </div>
            {/if}
            
            <div class="p-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                {book.name}
              </h3>
              
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">
                  {Object.keys(book.chapters).length} chapter{Object.keys(book.chapters).length !== 1 ? 's' : ''}
                </span>
                
                {#if book.lastAccessedChapter}
                  <span class="text-green-600 dark:text-green-400 text-xs">
                    Recently read
                  </span>
                {/if}
              </div>
              
              <p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Updated {new Date(book.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </a>
        {/each}
      </div>
    {:else}
      <!-- Empty state -->
      <div class="text-center py-12">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No books yet</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">Create your first book to start writing your story</p>
        <button
          onclick={() => showCreateBook = true}
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Your First Book
        </button>
      </div>
    {/if}

    <!-- Create Book Modal -->
    {#if showCreateBook}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Book</h2>
          
          <div class="space-y-4">
            <div>
              <label for="book-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Book Name *
              </label>
              <input
                id="book-name"
                bind:value={newBookName}
                type="text"
                placeholder="e.g., The Dragon's Quest"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autofocus
              />
            </div>
            
            <div>
              <label for="book-cover" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cover Image URL (optional)
              </label>
              <input
                id="book-cover"
                bind:value={newBookCover}
                type="url"
                placeholder="https://example.com/cover.jpg"
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
              onclick={createBook}
              disabled={!newBookName.trim()}
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Book
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <!-- Shelf not found -->
  <div class="p-4">
    <Breadcrumb items={[{ label: 'Library', path: '/library' }, { label: 'Not Found', path: '#' }]} />
    <div class="text-center py-12">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Shelf Not Found</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">The shelf you're looking for doesn't exist.</p>
      <a 
        href="/library" 
        use:link
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Back to Library
      </a>
    </div>
  </div>
{/if}

<style>
  .book-card:hover {
    transform: translateY(-2px);
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>