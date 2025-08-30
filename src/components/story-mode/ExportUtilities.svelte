<script lang="ts">
  import { content } from '../../App.svelte';
  import { exportHistory, exportStory, downloadAsFile, copyToClipboard, generateFilename } from '../../lib/export-utils';
  
  let exportType: 'history' | 'story' = $state('story');
  let exportFormat: 'json' | 'text' | 'markdown' = $state('text');
  let includeTimestamps = $state(false);
  let includeMetadata = $state(true);
  let showExportPanel = $state(false);

  async function handleExport() {
    const options = {
      includeTimestamps,
      includeMetadata,
      format: exportFormat
    };

    const exportedContent = exportType === 'history' 
      ? exportHistory(content.value, options)
      : exportStory(content.value, options);

    const filename = generateFilename(exportType, exportFormat);
    const mimeType = exportFormat === 'json' ? 'application/json' : 'text/plain';
    
    downloadAsFile(exportedContent, filename, mimeType);
  }

  async function handleCopyToClipboard() {
    const options = {
      includeTimestamps,
      includeMetadata,
      format: exportFormat
    };

    const exportedContent = exportType === 'history' 
      ? exportHistory(content.value, options)
      : exportStory(content.value, options);

    const success = await copyToClipboard(exportedContent);
    
    if (success) {
      // Show brief success feedback
      const btn = document.activeElement as HTMLElement;
      const originalText = btn?.textContent;
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => {
          if (btn) btn.textContent = originalText;
        }, 2000);
      }
    }
  }

  function getPreview() {
    const options = {
      includeTimestamps,
      includeMetadata,
      format: exportFormat
    };

    const preview = exportType === 'history' 
      ? exportHistory(content.value, options)
      : exportStory(content.value, options);

    // Limit preview to first 500 characters
    return preview.length > 500 ? preview.substring(0, 500) + '...' : preview;
  }

  let contentCount = $derived(Object.keys(content.value).length);
  let storyEntries = $derived(
    Object.values(content.value).filter(entry => 
      (entry.type === 'input' && entry.output?.trim()) ||
      (entry.type === 'llm' && entry.output?.trim())
    ).length
  );
</script>

<div class="export-utilities p-4 space-y-4">
  <h3 class="text-lg font-semibold mb-3">Export</h3>
  
  <!-- Export Stats -->
  <div class="text-sm text-gray-600 space-y-1 mb-4">
    <div>Total entries: {contentCount}</div>
    <div>Story entries: {storyEntries}</div>
  </div>

  <!-- Export Type Selection -->
  <div class="space-y-2">
    <label class="block text-sm font-medium">Export Type</label>
    <div class="space-y-2">
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          bind:group={exportType}
          value="story"
          class="text-blue-600"
        />
        <span class="text-sm">Story Only</span>
        <span class="text-xs text-gray-500">(clean prose text)</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          bind:group={exportType}
          value="history"
          class="text-blue-600"
        />
        <span class="text-sm">Complete History</span>
        <span class="text-xs text-gray-500">(all messages & metadata)</span>
      </label>
    </div>
  </div>

  <!-- Format Selection -->
  <div class="space-y-2">
    <label class="block text-sm font-medium">Format</label>
    <div class="flex gap-2">
      <label class="flex items-center gap-1 cursor-pointer">
        <input
          type="radio"
          bind:group={exportFormat}
          value="text"
          class="text-blue-600"
        />
        <span class="text-xs">Text</span>
      </label>
      <label class="flex items-center gap-1 cursor-pointer">
        <input
          type="radio"
          bind:group={exportFormat}
          value="markdown"
          class="text-blue-600"
        />
        <span class="text-xs">Markdown</span>
      </label>
      <label class="flex items-center gap-1 cursor-pointer">
        <input
          type="radio"
          bind:group={exportFormat}
          value="json"
          class="text-blue-600"
        />
        <span class="text-xs">JSON</span>
      </label>
    </div>
  </div>

  <!-- Options -->
  <div class="space-y-2">
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        bind:checked={includeTimestamps}
        class="text-blue-600"
      />
      <span class="text-sm">Include timestamps</span>
    </label>
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        bind:checked={includeMetadata}
        class="text-blue-600"
      />
      <span class="text-sm">Include metadata</span>
    </label>
  </div>

  <!-- Preview Toggle -->
  <button
    onclick={() => showExportPanel = !showExportPanel}
    class="w-full text-left text-sm text-blue-600 hover:text-blue-700"
  >
    {showExportPanel ? '▼' : '▶'} Preview Export
  </button>

  {#if showExportPanel}
    <div class="border rounded p-3 bg-gray-50 dark:bg-gray-900">
      <div class="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
        {getPreview()}
      </div>
    </div>
  {/if}

  <!-- Export Actions -->
  <div class="flex gap-2 pt-2">
    <button
      onclick={handleExport}
      class="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
      disabled={contentCount === 0}
    >
      Download
    </button>
    <button
      onclick={handleCopyToClipboard}
      class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
      disabled={contentCount === 0}
    >
      Copy
    </button>
  </div>

  {#if contentCount === 0}
    <p class="text-sm text-gray-500 text-center">No content to export</p>
  {/if}
</div>