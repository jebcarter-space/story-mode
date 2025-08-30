<script lang="ts">
  import type { TokenCountInfo } from '../../lib/llm-service';

  interface LLMIndicatorProps {
    isGenerating?: boolean;
    profileName?: string;
    error?: string;
    onCancel?: () => void;
    tokenInfo?: TokenCountInfo;
  }

  let { isGenerating = false, profileName = '', error = '', onCancel, tokenInfo }: LLMIndicatorProps = $props();

  // Calculate usage percentage
  let usagePercent = $derived(tokenInfo?.maxContextSize 
    ? Math.min((tokenInfo.tokens / tokenInfo.maxContextSize) * 100, 100)
    : 0);

  // Determine progress bar color based on usage
  let progressColor = $derived(usagePercent > 90 ? 'bg-red-500' : usagePercent > 75 ? 'bg-yellow-500' : 'bg-green-500');
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

<!-- Token Usage Indicator -->
{#if tokenInfo && tokenInfo.maxContextSize}
  <div class="p-2 bg-gray-50 border border-gray-200 rounded mb-2">
    <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
      <span>Context Usage</span>
      <span>
        {tokenInfo.tokens.toLocaleString()} / {tokenInfo.maxContextSize.toLocaleString()} tokens 
        ({usagePercent.toFixed(1)}%)
        {#if tokenInfo.isEstimate}
          <span class="text-gray-500">(estimated)</span>
        {/if}
      </span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2">
      <div 
        class="h-2 rounded-full transition-all duration-300 {progressColor}"
        style="width: {usagePercent}%"
        title="Context usage: {tokenInfo.tokens} / {tokenInfo.maxContextSize} tokens"
      ></div>
    </div>
    {#if usagePercent > 90}
      <div class="text-xs text-red-600 mt-1">
        ⚠️ Approaching context limit
      </div>
    {/if}
  </div>
{/if}