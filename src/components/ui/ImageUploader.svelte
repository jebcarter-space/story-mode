<script lang="ts">
  import { processImageFile } from '../../lib/image-handler';
  import type { ImageUploadResult } from '../../lib/image-handler';

  interface ImageUploaderProps {
    accept?: string;
    maxSize?: number; // in bytes
    placeholder?: string;
    value?: string;
    onChange: (result: ImageUploadResult | null) => void;
    label?: string;
    showPreview?: boolean;
    previewSize?: 'small' | 'medium' | 'large';
  }

  let {
    accept = 'image/jpeg,image/jpg,image/png,image/webp',
    maxSize = 5 * 1024 * 1024, // 5MB default
    placeholder = 'Choose an image file...',
    value = '',
    onChange,
    label = 'Image',
    showPreview = true,
    previewSize = 'medium'
  }: ImageUploaderProps = $props();

  let fileInput: HTMLInputElement;
  let dragOver = $state(false);
  let uploading = $state(false);
  let error = $state('');
  let currentImage = $state(value);

  // Update current image when value prop changes
  $effect(() => {
    currentImage = value;
  });

  const previewSizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32', 
    large: 'w-48 h-48'
  };

  async function handleFileSelect(file: File) {
    if (!file) return;
    
    error = '';
    uploading = true;

    try {
      const result = await processImageFile(file);
      currentImage = result.url;
      onChange(result);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to process image';
      onChange(null);
    } finally {
      uploading = false;
    }
  }

  function handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
  }

  function clearImage() {
    currentImage = '';
    onChange(null);
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function openFileDialog() {
    fileInput?.click();
  }
</script>

<div class="image-uploader">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label}
    </label>
  {/if}

  <!-- Hidden file input -->
  <input
    bind:this={fileInput}
    type="file"
    {accept}
    class="hidden"
    onchange={handleInputChange}
  />

  <!-- Preview and Upload Area -->
  <div class="flex items-start gap-4">
    <!-- Image Preview -->
    {#if showPreview && currentImage}
      <div class="flex-shrink-0">
        <div class="relative">
          <img
            src={currentImage}
            alt="Preview"
            class="{previewSizeClasses[previewSize]} object-cover rounded-lg border border-gray-300 dark:border-gray-600"
          />
          <button
            type="button"
            onclick={clearImage}
            class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            title="Remove image"
          >
            ×
          </button>
        </div>
      </div>
    {/if}

    <!-- Upload Area -->
    <div class="flex-1">
      <div
        class="border-2 border-dashed rounded-lg p-6 text-center transition-colors {dragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}"
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        role="button"
        tabindex="0"
        onclick={openFileDialog}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFileDialog();
          }
        }}
      >
        {#if uploading}
          <div class="text-blue-600 dark:text-blue-400">
            <svg class="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <p class="text-sm">Processing image...</p>
          </div>
        {:else}
          <div class="text-gray-600 dark:text-gray-400">
            <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p class="text-sm mb-1">
              <span class="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                Click to upload
              </span> or drag and drop
            </p>
            <p class="text-xs">
              JPG, PNG, WebP up to {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        {/if}
      </div>
      
      {#if error}
        <p class="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .image-uploader {
    /* Additional styles if needed */
  }
</style>