<script lang="ts">
  import { link } from 'svelte-routing';
  import { createLibrary } from '../../data/models/library.svelte';
  import Breadcrumb from '../ui/Breadcrumb.svelte';
  import BookCover from '../ui/BookCover.svelte';
  import ShelfBanner from '../ui/ShelfBanner.svelte';
  import ImageUploader from '../ui/ImageUploader.svelte';
  import { setRepositoryContext } from '../../lib/repository-context';
  import type { ImageUploadResult } from '../../lib/image-handler';

  let { shelfId }: { shelfId: string } = $props();

  const library = createLibrary();

  let shelf = $derived(library.value?.shelves[shelfId]);
  let breadcrumbItems = $derived([
    { label: 'Home', path: '/' },
    { label: 'Library', path: '/library' },
    { label: shelf?.name || 'Shelf', path: `/library/${shelfId}` }
  ]);

  let showCreateBook = $state(false);
  let newBookName = $state('');
  let newBookCover = $state('');

  async function createBook() {
    if (newBookName.trim()) {
      await library.createBook(shelfId, newBookName.trim(), newBookCover.trim() || undefined);
      cancelCreate();
    }
  }

  function cancelCreate() {
    newBookName = '';
    newBookCover = '';
    showCreateBook = false;
  }

  function handleCoverUpload(result: ImageUploadResult | null) {
    newBookCover = result?.url || '';
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
        <ShelfBanner {shelf} height="medium" showOverlay={true} showBookCount={true}>
          <svelte:fragment slot="actions">
            <button
              onclick={() => showCreateBook = true}
              style="background-color: var(--theme-secondary, #3b82f6); color: white;"
              class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-md hover:opacity-90"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              New Book
            </button>
          </svelte:fragment>
        </ShelfBanner>
      {:else}
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{shelf.name}</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-2">
              {Object.keys(shelf.books).length} book{Object.keys(shelf.books).length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button
            onclick={() => showCreateBook = true}
            style="background-color: var(--theme-secondary, #3b82f6); color: white;"
            class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 hover:opacity-90"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            New Book
          </button>
        </div>
      {/if}
    </div>

    <!-- Books Display -->
    {#if Object.keys(shelf.books).length > 0}
      {#if shelf.bannerImage}
        <!-- With banner: spread out grid layout -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 justify-items-center">
          {#each Object.entries(shelf.books) as [bookId, book] (bookId)}
            <BookCover 
              {book} 
              size="medium" 
              clickable={true}
              showTitle={true}
              showChapterCount={true}
              href="/library/{shelfId}/{bookId}"
            />
          {/each}
        </div>
      {:else}
        <!-- Without banner: overlapping shelf effect -->
        <div class="flex flex-wrap items-end gap-4 justify-center md:justify-start pl-4">
          {#each Object.entries(shelf.books) as [bookId, book] (bookId)}
            <a href="/library/{shelfId}/{bookId}" use:link class="block">
              <BookCover 
                {book} 
                size="medium" 
                clickable={true}
                showTitle={false}
                showChapterCount={true}
                overlapping={true}
              />
            </a>
          {/each}
        </div>
        
        <!-- Book titles below when overlapping -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each Object.entries(shelf.books) as [bookId, book] (bookId)}
            <a 
              href="/library/{shelfId}/{bookId}" 
              use:link
              class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 block"
            >
              <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {book.name}
              </h3>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">
                  {Object.keys(book.chapters).length} chapter{Object.keys(book.chapters).length !== 1 ? 's' : ''}
                </span>
                {#if book.lastAccessedChapter}
                  <span style="color: var(--theme-primary, #22c55e);" class="text-xs">
                    Recently read
                  </span>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      {/if}
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
          style="background-color: var(--theme-secondary, #3b82f6); color: white;"
          class="px-6 py-3 rounded-lg transition-colors hover:opacity-90"
        >
          Create Your First Book
        </button>
      </div>
    {/if}

    <!-- Create Book Modal -->
    {#if showCreateBook}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Book</h2>
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
              <label for="book-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Book Title *
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
            
            <ImageUploader
              label="Cover Image (optional)"
              value={newBookCover}
              onChange={handleCoverUpload}
              previewSize="small"
              placeholder="Upload a cover image for your book..."
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
              onclick={createBook}
              disabled={!newBookName.trim()}
              style="background-color: var(--theme-secondary, #3b82f6); color: white;"
              class="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
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
    <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Library', path: '/library' }, { label: 'Not Found', path: '#' }]} />
    <div class="text-center py-12">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Shelf Not Found</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">The shelf you're looking for doesn't exist.</p>
      <a 
        href="/library" 
        use:link
        style="background-color: var(--theme-secondary, #3b82f6); color: white;"
        class="px-6 py-3 rounded-lg transition-colors hover:opacity-90"
      >
        Back to Library
      </a>
    </div>
  </div>
{/if}

<style>
  /* Styles managed by components */
</style>