<script lang="ts">
  import { getDefaultImage, preloadImage } from '../../lib/image-handler';
  import type { Book } from '../../data/types';

  interface BookCoverProps {
    book: Book;
    size?: 'small' | 'medium' | 'large';
    clickable?: boolean;
    showTitle?: boolean;
    showChapterCount?: boolean;
    overlapping?: boolean;
    href?: string;
  }

  let {
    book,
    size = 'medium',
    clickable = false,
    showTitle = true,
    showChapterCount = true,
    overlapping = false,
    href
  }: BookCoverProps = $props();

  let imageLoaded = $state(false);
  let imageError = $state(false);
  let imageUrl = $state('');

  const sizeClasses = {
    small: {
      container: 'w-20 h-28',
      image: 'w-20 h-28',
      title: 'text-xs',
      subtitle: 'text-xs'
    },
    medium: {
      container: 'w-32 h-44',
      image: 'w-32 h-44',
      title: 'text-sm',
      subtitle: 'text-xs'
    },
    large: {
      container: 'w-48 h-64',
      image: 'w-48 h-64',
      title: 'text-base',
      subtitle: 'text-sm'
    }
  };

  const chapterCount = Object.keys(book.chapters || {}).length;

  // Handle image loading
  $effect(async () => {
    if (book.coverImage) {
      try {
        const loaded = await preloadImage(book.coverImage);
        if (loaded) {
          imageUrl = book.coverImage;
          imageLoaded = true;
          imageError = false;
        } else {
          throw new Error('Failed to load image');
        }
      } catch {
        imageError = true;
        imageUrl = getDefaultImage('book', book.name);
        imageLoaded = true;
      }
    } else {
      imageUrl = getDefaultImage('book', book.name);
      imageLoaded = true;
      imageError = false;
    }
  });

  const containerClass = `
    book-cover relative flex-shrink-0 transition-transform duration-200
    ${sizeClasses[size].container}
    ${clickable ? 'cursor-pointer hover:scale-105' : ''}
    ${overlapping ? 'transform rotate-2 hover:rotate-0 hover:z-10' : ''}
  `;

  const imageClass = `
    ${sizeClasses[size].image}
    object-cover rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
    ${!imageLoaded ? 'opacity-0' : 'opacity-100'}
    transition-opacity duration-300
  `;
</script>

{#if href && clickable}
  <a {href} class="block">
    <div class={containerClass}>
      <div class="relative">
        {#if imageLoaded}
          <img
            src={imageUrl}
            alt="{book.name} cover"
            class={imageClass}
            loading="lazy"
          />
        {:else}
          <!-- Loading placeholder -->
          <div class="{sizeClasses[size].image} bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
            </svg>
          </div>
        {/if}

        <!-- Chapter count badge -->
        {#if showChapterCount && chapterCount > 0}
          <div class="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full shadow-md">
            {chapterCount}
          </div>
        {/if}
      </div>

      {#if showTitle}
        <div class="mt-2 text-center">
          <h3 class="{sizeClasses[size].title} font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
            {book.name}
          </h3>
          {#if showChapterCount}
            <p class="{sizeClasses[size].subtitle} text-gray-600 dark:text-gray-400 mt-1">
              {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </a>
{:else}
  <div class={containerClass} onclick={clickable ? () => window.location.href = href || '#' : undefined}>
    <div class="relative">
      {#if imageLoaded}
        <img
          src={imageUrl}
          alt="{book.name} cover"
          class={imageClass}
          loading="lazy"
        />
      {:else}
        <!-- Loading placeholder -->
        <div class="{sizeClasses[size].image} bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
          </svg>
        </div>
      {/if}

      <!-- Chapter count badge -->
      {#if showChapterCount && chapterCount > 0}
        <div class="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full shadow-md">
          {chapterCount}
        </div>
      {/if}
    </div>

    {#if showTitle}
      <div class="mt-2 text-center">
        <h3 class="{sizeClasses[size].title} font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
          {book.name}
        </h3>
        {#if showChapterCount}
          <p class="{sizeClasses[size].subtitle} text-gray-600 dark:text-gray-400 mt-1">
            {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
          </p>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .book-cover {
    /* Additional styles if needed */
  }

  /* Overlapping effect for shelf display */
  .book-cover.overlapping:nth-child(even) {
    transform: rotate(-1deg);
  }
  
  .book-cover.overlapping:nth-child(odd) {
    transform: rotate(1deg);
  }
  
  .book-cover.overlapping:hover {
    z-index: 10;
    transform: rotate(0deg) scale(1.05);
  }
</style>