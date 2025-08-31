<script lang="ts">
  import { getDefaultImage, preloadImage } from '../../lib/image-handler';
  import type { Shelf } from '../../data/types';

  interface ShelfBannerProps {
    shelf: Shelf;
    height?: 'small' | 'medium' | 'large';
    showOverlay?: boolean;
    showBookCount?: boolean;
  }

  let {
    shelf,
    height = 'medium',
    showOverlay = true,
    showBookCount = true
  }: ShelfBannerProps = $props();

  let imageLoaded = $state(false);
  let imageError = $state(false);
  let imageUrl = $state('');

  const heightClasses = {
    small: 'h-32',
    medium: 'h-48',
    large: 'h-64'
  };

  const bookCount = Object.keys(shelf.books || {}).length;

  // Handle image loading
  $effect(async () => {
    if (shelf.bannerImage) {
      try {
        const loaded = await preloadImage(shelf.bannerImage);
        if (loaded) {
          imageUrl = shelf.bannerImage;
          imageLoaded = true;
          imageError = false;
        } else {
          throw new Error('Failed to load image');
        }
      } catch {
        imageError = true;
        imageUrl = getDefaultImage('shelf', shelf.name);
        imageLoaded = true;
      }
    } else {
      imageUrl = getDefaultImage('shelf', shelf.name);
      imageLoaded = true;
      imageError = false;
    }
  });
</script>

<div class="shelf-banner relative w-full {heightClasses[height]} rounded-lg overflow-hidden shadow-lg">
  {#if imageLoaded}
    <img
      src={imageUrl}
      alt="{shelf.name} banner"
      class="w-full h-full object-cover transition-opacity duration-300"
      loading="lazy"
    />
  {:else}
    <!-- Loading placeholder -->
    <div class="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
      <svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
      </svg>
    </div>
  {/if}

  {#if showOverlay}
    <!-- Gradient overlay for better text readability -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
    
    <!-- Content overlay -->
    <div class="absolute bottom-0 left-0 right-0 p-4 text-white">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-2xl font-bold mb-1 shadow-text">
            {shelf.name}
          </h2>
          {#if showBookCount}
            <p class="text-sm opacity-90 shadow-text">
              {bookCount} book{bookCount !== 1 ? 's' : ''}
            </p>
          {/if}
        </div>
        
        <!-- Optional actions area -->
        <div class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </div>
      
      <!-- Last updated info -->
      <p class="text-xs opacity-75 mt-2 shadow-text">
        Updated {new Date(shelf.updatedAt).toLocaleDateString()}
      </p>
    </div>
  {/if}

  <!-- Badge for book count (when no overlay) -->
  {#if !showOverlay && showBookCount && bookCount > 0}
    <div class="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-medium shadow-md">
      {bookCount}
    </div>
  {/if}
</div>

<style>
  .shadow-text {
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }
  
  .shelf-banner {
    /* Additional styles if needed */
  }
</style>