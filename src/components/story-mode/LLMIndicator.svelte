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

  // Determine progress bar color based on usage (using CSS custom properties)
  let progressColor = $derived(usagePercent > 90 ? 'var(--theme-danger)' : usagePercent > 75 ? 'var(--theme-warning)' : 'var(--theme-success)');
</script>

{#if isGenerating}
  <div class="flex items-center justify-between p-2 rounded mb-2" style="background-color: var(--theme-input); border: 1px solid var(--theme-border);">
    <div class="flex items-center gap-2">
      <div class="animate-spin h-4 w-4 border-2 rounded-full" style="border-color: var(--theme-accent); border-top-color: transparent;"></div>
      <span class="text-sm" style="color: var(--theme-foreground);">
        Generating with {profileName}...
      </span>
    </div>
    {#if onCancel}
      <button 
        onclick={onCancel}
        class="px-2 py-1 text-xs rounded hover:opacity-80"
        style="background-color: var(--theme-danger); color: var(--theme-background);"
      >
        Cancel
      </button>
    {/if}
  </div>
{:else if error}
  <div class="p-2 rounded mb-2" style="background-color: var(--theme-input); border: 1px solid var(--theme-danger);">
    <div class="flex items-center gap-2">
      <span style="color: var(--theme-danger);">⚠️</span>
      <span class="text-sm" style="color: var(--theme-danger);">
        LLM Error: {error}
      </span>
    </div>
  </div>
{/if}

<!-- Token Usage Indicator -->
{#if tokenInfo && tokenInfo.maxContextSize}
  <div class="p-2 rounded mb-2" style="background-color: var(--theme-input); border: 1px solid var(--theme-border);">
    <div class="flex items-center justify-between text-xs mb-1" style="color: var(--theme-foreground);">
      <span>Context Usage</span>
      <span>
        {tokenInfo.tokens.toLocaleString()} / {tokenInfo.maxContextSize.toLocaleString()} tokens 
        ({usagePercent.toFixed(1)}%)
        {#if tokenInfo.isEstimate}
          <span style="color: var(--theme-muted);">(estimated)</span>
        {/if}
      </span>
    </div>
    <div class="w-full rounded-full h-2" style="background-color: var(--theme-muted);">
      <div 
        class="h-2 rounded-full transition-all duration-300"
        style="width: {usagePercent}%; background-color: {progressColor};"
        title="Context usage: {tokenInfo.tokens} / {tokenInfo.maxContextSize} tokens"
      ></div>
    </div>
    {#if usagePercent > 90}
      <div class="text-xs mt-1" style="color: var(--theme-danger);">
        ⚠️ Approaching context limit
      </div>
    {/if}
  </div>
{/if}