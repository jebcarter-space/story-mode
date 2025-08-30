<script lang="ts">
  interface LLMIndicatorProps {
    isGenerating?: boolean;
    profileName?: string;
    error?: string;
    onCancel?: () => void;
  }

  let { isGenerating = false, profileName = '', error = '', onCancel }: LLMIndicatorProps = $props();
</script>

{#if isGenerating}
  <div class="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded mb-2">
    <div class="flex items-center gap-2">
      <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      <span class="text-sm text-blue-700">
        Generating with {profileName}...
      </span>
    </div>
    {#if onCancel}
      <button 
        onclick={onCancel}
        class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
      >
        Cancel
      </button>
    {/if}
  </div>
{:else if error}
  <div class="p-2 bg-red-50 border border-red-200 rounded mb-2">
    <div class="flex items-center gap-2">
      <span class="text-red-500">⚠️</span>
      <span class="text-sm text-red-700">
        LLM Error: {error}
      </span>
    </div>
  </div>
{/if}