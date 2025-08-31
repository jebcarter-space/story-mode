&lt;script lang="ts"&gt;
  import type { 
    ExtractionSuggestion,
    AutoExtractionSettings,
    RepositoryCategory,
    RepositoryContext
  } from '../../data/types';
  import type { AutoExtractionService } from '../../lib/auto-extraction-service';

  let {
    suggestions,
    settings,
    context,
    extractionService,
    onApproveSuggestion = undefined,
    onRejectSuggestion = undefined,
    onClearProcessed = undefined,
    onUpdateSettings = undefined
  } = $props();

  let showSettings = $state(false);
  let tempSettings = $state(structuredClone(settings));

  // Category icons and colors
  const getCategoryConfig = (category) => {
    switch(category) {
      case 'Character': return { icon: '👤', color: 'bg-blue-100 border-blue-300' };
      case 'Location': return { icon: '🗺️', color: 'bg-green-100 border-green-300' };
      case 'Object': return { icon: '🎒', color: 'bg-purple-100 border-purple-300' };
      case 'Situation': return { icon: '⚡', color: 'bg-orange-100 border-orange-300' };
      default: return { icon: '❓', color: 'bg-gray-100 border-gray-300' };
    }
  };

  function handleApprove(suggestionId: string) {
    // Default to chapter scope, but allow user to choose
    const scope = 'chapter'; // TODO: Make this configurable in UI
    onApproveSuggestion?.(suggestionId, scope);
  }

  function handleReject(suggestionId: string) {
    onRejectSuggestion?.(suggestionId);
  }

  function handleSettingsUpdate() {
    onUpdateSettings?.(tempSettings);
    showSettings = false;
  }

  function resetSettings() {
    tempSettings = structuredClone(settings);
  }

  // Get confidence bar color based on confidence level
  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  // Format confidence as percentage
  function formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }
&lt;/script&gt;

&lt;div class="auto-extraction-panel border rounded-lg p-4 bg-white"&gt;
  &lt;!-- Header --&gt;
  &lt;div class="flex items-center justify-between mb-4"&gt;
    &lt;div class="flex items-center gap-2"&gt;
      &lt;h3 class="text-lg font-medium"&gt;🤖 Auto-Extraction&lt;/h3&gt;
      {#if suggestions.length > 0}
        &lt;span class="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded"&gt;
          {suggestions.length} suggestions
        &lt;/span&gt;
      {/if}
    &lt;/div&gt;
    &lt;div class="flex gap-2"&gt;
      &lt;button
        onclick={() => onClearProcessed?.()}
        class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
        title="Clear processed suggestions"
      &gt;
        Clear
      &lt;/button&gt;
      &lt;button
        onclick={() => showSettings = !showSettings}
        class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
        title="Extraction settings"
      &gt;
        ⚙️
      &lt;/button&gt;
    &lt;/div&gt;
  &lt;/div&gt;

  &lt;!-- Settings Panel --&gt;
  {#if showSettings}
    &lt;div class="mb-4 p-3 border rounded bg-gray-50"&gt;
      &lt;h4 class="text-sm font-medium mb-3"&gt;Extraction Settings&lt;/h4&gt;
      
      &lt;div class="space-y-3"&gt;
        &lt;label class="flex items-center"&gt;
          &lt;input
            type="checkbox"
            bind:checked={tempSettings.enabled}
            class="mr-2"
          /&gt;
          Enable auto-extraction
        &lt;/label&gt;

        &lt;div&gt;
          &lt;label class="block text-sm font-medium mb-1"&gt;
            Min Confidence: {formatConfidence(tempSettings.minConfidence)}
          &lt;/label&gt;
          &lt;input
            type="range"
            min="0"
            max="1"
            step="0.1"
            bind:value={tempSettings.minConfidence}
            class="w-full"
          /&gt;
        &lt;/div&gt;

        &lt;div&gt;
          &lt;label class="block text-sm font-medium mb-1"&gt;Max suggestions per session&lt;/label&gt;
          &lt;input
            type="number"
            min="1"
            max="50"
            bind:value={tempSettings.maxSuggestionsPerSession}
            class="w-full px-2 py-1 border rounded"
          /&gt;
        &lt;/div&gt;

        &lt;div&gt;
          &lt;label class="block text-sm font-medium mb-2"&gt;Extract categories:&lt;/label&gt;
          &lt;div class="flex flex-wrap gap-2"&gt;
            {#each ['Character', 'Location', 'Object', 'Situation'] as category}
              &lt;label class="flex items-center"&gt;
                &lt;input
                  type="checkbox"
                  checked={tempSettings.categories.includes(category as RepositoryCategory)}
                  onchange={(e) => {
                    if (e.target?.checked) {
                      tempSettings.categories = [...tempSettings.categories, category as RepositoryCategory];
                    } else {
                      tempSettings.categories = tempSettings.categories.filter(c => c !== category);
                    }
                  }}
                  class="mr-1"
                /&gt;
                &lt;span class="text-sm"&gt;{getCategoryConfig(category).icon} {category}&lt;/span&gt;
              &lt;/label&gt;
            {/each}
          &lt;/div&gt;
        &lt;/div&gt;

        &lt;label class="flex items-center"&gt;
          &lt;input
            type="checkbox"
            bind:checked={tempSettings.autoApproveHighConfidence}
            class="mr-2"
          /&gt;
          Auto-approve high confidence (&gt;{formatConfidence(tempSettings.highConfidenceThreshold)})
        &lt;/label&gt;
      &lt;/div&gt;

      &lt;div class="flex gap-2 mt-3 pt-3 border-t"&gt;
        &lt;button
          onclick={handleSettingsUpdate}
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        &gt;
          Save
        &lt;/button&gt;
        &lt;button
          onclick={resetSettings}
          class="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        &gt;
          Reset
        &lt;/button&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  {/if}

  &lt;!-- Suggestions List --&gt;
  {#if !settings.enabled}
    &lt;div class="text-sm text-gray-500 text-center py-4"&gt;
      Auto-extraction is disabled. Enable it in settings to see suggestions.
    &lt;/div&gt;
  {:else if suggestions.length === 0}
    &lt;div class="text-sm text-gray-500 text-center py-4"&gt;
      No extraction suggestions available. Add more story content to see suggestions.
    &lt;/div&gt;
  {:else}
    &lt;div class="space-y-3 max-h-96 overflow-y-auto"&gt;
      {#each suggestions as suggestion (suggestion.id)}
        &lt;div class="border rounded p-3 {getCategoryConfig(suggestion.entity.category).color}"&gt;
          &lt;div class="flex items-start justify-between mb-2"&gt;
            &lt;div class="flex items-center gap-2"&gt;
              &lt;span class="text-lg"&gt;{getCategoryConfig(suggestion.entity.category).icon}&lt;/span&gt;
              &lt;div&gt;
                &lt;h4 class="font-medium"&gt;{suggestion.entity.name}&lt;/h4&gt;
                &lt;span class="text-xs px-1 py-0.5 bg-white bg-opacity-60 rounded"&gt;
                  {suggestion.entity.category}
                &lt;/span&gt;
              &lt;/div&gt;
            &lt;/div&gt;
            
            &lt;div class="flex items-center gap-2"&gt;
              &lt;div class="flex items-center gap-1 text-xs"&gt;
                &lt;span&gt;Confidence:&lt;/span&gt;
                &lt;div class="w-12 h-2 bg-gray-200 rounded"&gt;
                  &lt;div
                    class="h-full rounded {getConfidenceColor(suggestion.entity.confidence)}"
                    style="width: {suggestion.entity.confidence * 100}%"
                  &gt;&lt;/div&gt;
                &lt;/div&gt;
                &lt;span&gt;{formatConfidence(suggestion.entity.confidence)}&lt;/span&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;

          &lt;p class="text-sm text-gray-700 mb-2"&gt;{suggestion.entity.description}&lt;/p&gt;

          {#if suggestion.entity.keywords.length > 0}
            &lt;div class="flex flex-wrap gap-1 mb-3"&gt;
              {#each suggestion.entity.keywords as keyword}
                &lt;span class="text-xs px-2 py-1 bg-white bg-opacity-60 rounded"&gt;
                  {keyword}
                &lt;/span&gt;
              {/each}
            &lt;/div&gt;
          {/if}

          &lt;div class="flex items-center justify-between"&gt;
            &lt;div class="text-xs text-gray-600"&gt;
              From: {suggestion.entity.sourceText}
            &lt;/div&gt;
            
            &lt;div class="flex gap-2"&gt;
              &lt;button
                onclick={() => handleReject(suggestion.id)}
                class="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              &gt;
                Reject
              &lt;/button&gt;
              &lt;button
                onclick={() => handleApprove(suggestion.id)}
                class="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              &gt;
                Add to Repository
              &lt;/button&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      {/each}
    &lt;/div&gt;
  {/if}
&lt;/div&gt;

&lt;style&gt;
  .auto-extraction-panel {
    max-width: 100%;
  }
  
  .auto-extraction-panel h3 {
    margin: 0;
  }
  
  .auto-extraction-panel input[type="range"] {
    accent-color: #3b82f6;
  }
&lt;/style&gt;