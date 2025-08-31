<script lang="ts">
  import { link } from 'svelte-routing';
  import { createLibrary } from '../../data/models/library.svelte';
  import Breadcrumb from '../ui/Breadcrumb.svelte';
  import Content from '../story-mode/Content.svelte';
  import Sidebar from '../story-mode/Sidebar.svelte';
  import Input from '../story-mode/Input.svelte';
  import Header from '../ui/Header.svelte';
  import { content as globalContent } from '../../App.svelte';
  import type { Content as ContentType } from '../../data/types';
  import { setRepositoryContext } from '../../lib/repository-context';

  let { shelfId, bookId, chapterId }: { shelfId: string; bookId: string; chapterId?: string } = $props();

  const library = createLibrary();
  
  // Get current shelf and book
  let shelf = $derived(library.value?.shelves[shelfId]);
  let book = $derived(shelf?.books[bookId]);
  let chapters = $derived(book?.chapters ? Object.entries(book.chapters) : []);
  let currentChapter = $derived(
    chapterId && book?.chapters[chapterId] 
      ? book.chapters[chapterId] 
      : (book?.lastAccessedChapter && book.chapters[book.lastAccessedChapter]
          ? book.chapters[book.lastAccessedChapter]
          : chapters[0]?.[1])
  );
  let currentChapterId = $derived(
    chapterId || book?.lastAccessedChapter || chapters[0]?.[0]
  );

  let breadcrumbItems = $derived([
    { label: 'Home', path: '/' },
    { label: 'Library', path: '/library' },
    { label: shelf?.name || 'Shelf', path: `/library/${shelfId}` },
    { label: book?.name || 'Book', path: `/library/${shelfId}/${bookId}` }
  ]);

  let showCreateChapter = $state(false);
  let newChapterName = $state('');

  // Load chapter content when chapter changes
  $effect(() => {
    if (currentChapter) {
      // Replace global content with chapter content
      globalContent.value = { ...currentChapter.content };
    }
  });

  // Set repository context for scoping
  $effect(() => {
    setRepositoryContext({
      shelfId,
      bookId,
      chapterId: currentChapterId
    });
  });

  // Save chapter content when global content changes
  $effect(() => {
    if (currentChapter && currentChapterId && library.value) {
      const saveContent = setTimeout(async () => {
        await library.updateChapter(shelfId, bookId, currentChapterId, globalContent.value);
      }, 1000);
      
      return () => clearTimeout(saveContent);
    }
  });

  async function createChapter() {
    if (newChapterName.trim()) {
      const newChapterId = await library.createChapter(shelfId, bookId, newChapterName.trim());
      newChapterName = '';
      showCreateChapter = false;
      // Navigate to the new chapter
      window.location.hash = `#/library/${shelfId}/${bookId}/${newChapterId}`;
    }
  }

  function cancelCreate() {
    newChapterName = '';
    showCreateChapter = false;
  }

  function switchToChapter(newChapterId: string) {
    window.location.hash = `#/library/${shelfId}/${bookId}/${newChapterId}`;
  }
</script>

{#if !library.isLoaded}
  <div class="flex items-center justify-center py-12">
    <div class="text-lg text-gray-600 dark:text-gray-400">Loading book...</div>
  </div>
{:else if book && shelf}
  <div class="book-page">
    <Header />
    <div class="p-4">
      <Breadcrumb items={breadcrumbItems} />
      
      <!-- Book Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{book.name}</h1>
            <p class="text-gray-600 dark:text-gray-400">
              {Object.keys(book.chapters).length} chapter{Object.keys(book.chapters).length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button
            onclick={() => showCreateChapter = true}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Chapter
          </button>
        </div>

        <!-- Chapter Navigation -->
        {#if chapters.length > 0}
          <div class="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Chapters:</span>
            {#each chapters as [chId, chapter], index (chId)}
              <button
                onclick={() => switchToChapter(chId)}
                class="px-3 py-1 text-sm rounded-full transition-colors {
                  currentChapterId === chId 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }"
              >
                {index + 1}. {chapter.name}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Chapter Content -->
      {#if currentChapter}
        <div class="chapter-content">
          <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h2 class="text-lg font-semibold text-blue-900 dark:text-blue-100">
              📖 {currentChapter.name}
            </h2>
            <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Created {new Date(currentChapter.createdAt).toLocaleDateString()}
              {currentChapter.updatedAt !== currentChapter.createdAt && 
                ` • Updated ${new Date(currentChapter.updatedAt).toLocaleDateString()}`
              }
            </p>
          </div>

          <!-- Story Mode Interface -->
          <Content />
          <div class="flex flex-col gap-2 mt-4">
            <Sidebar />
            <Input />
          </div>
        </div>
      {:else if chapters.length === 0}
        <!-- No chapters exist -->
        <div class="text-center py-12">
          <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No chapters yet</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">Start your story by creating the first chapter</p>
          <button
            onclick={() => showCreateChapter = true}
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Chapter
          </button>
        </div>
      {:else}
        <!-- Chapter not found -->
        <div class="text-center py-12">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Chapter not found</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">The chapter you're looking for doesn't exist</p>
          <button
            onclick={() => switchToChapter(chapters[0][0])}
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to First Chapter
          </button>
        </div>
      {/if}
    </div>

    <!-- Create Chapter Modal -->
    {#if showCreateChapter}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Chapter</h2>
          
          <div class="space-y-4">
            <div>
              <label for="chapter-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chapter Name *
              </label>
              <input
                id="chapter-name"
                bind:value={newChapterName}
                type="text"
                placeholder="e.g., The Beginning"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autofocus
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
              onclick={createChapter}
              disabled={!newChapterName.trim()}
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Chapter
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <!-- Book/Shelf not found -->
  <div class="p-4">
    <Breadcrumb items={[{ label: 'Library', path: '/library' }, { label: 'Not Found', path: '#' }]} />
    <div class="text-center py-12">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Book Not Found</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">The book you're looking for doesn't exist.</p>
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
  :global(.chapter-content) {
    /* Ensure content components have proper styling */
  }
</style>