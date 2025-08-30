<script lang="ts" module>
  import { content } from "../../App.svelte";
  import { createInput } from "../../data/models/input.svelte";
  import { createLLMProfiles } from "../../data/models/llm-profiles.svelte";
  import { createRepositories } from "../../data/models/repositories.svelte";
  import type { ContentData } from "../../data/types";
  import { addInput, getAnswer } from "./functions";
  import { LLMService } from "../../lib/llm-service";

  export let input = createInput();
</script>

<script lang="ts">
  import FloatingPanel from './FloatingPanel.svelte';
  import LLMIndicator from './LLMIndicator.svelte';
  import Sidebar from './Sidebar.svelte';
  import ExportUtilities from './ExportUtilities.svelte';
  
  let isWriterMode = $state(true);
  let isFullscreen = $state(false);
  let panelPosition = $state({ x: 20, y: 100 });
  let panelSize = $state({ width: 320, height: 500 });
  let currentPanel: 'controls' | 'export' = $state('controls');
  
  let writingArea: HTMLElement;
  let writingText = $state('');
  let cleared = $derived(input.cleared);
  
  let profiles = createLLMProfiles();
  let repositories = createRepositories();
  let selectedProfileKey = $state(localStorage.getItem('selected-llm-profile') || '');
  let isGenerating = $state(false);
  let llmError = $state('');
  let abortController: AbortController | null = null;

  // Get the currently selected profile
  let selectedProfile = $derived(
    selectedProfileKey ? profiles.value[selectedProfileKey] : null
  );

  // Get content as array sorted by timestamp for context
  let contentArray = $derived(
    Object.entries(content.value)
      .map(([timestamp, data]) => ({ timestamp: parseInt(timestamp), ...data }))
      .sort((a, b) => a.timestamp - b.timestamp)
  );

  $effect(() => {
    if(cleared) {
      writingText = '';
      input.emptied();
    }
  });

  $effect(() => {
    // Save selected profile to localStorage when it changes
    if (selectedProfileKey) {
      localStorage.setItem('selected-llm-profile', selectedProfileKey);
    }
  });

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    if (isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  async function generateLLMResponse() {
    if (!selectedProfile) {
      llmError = 'No LLM profile selected';
      return;
    }

    // Add current writing as input if it has content
    if (writingText.trim()) {
      const inputContent: ContentData = {
        type: 'input',
        input: writingText.trim(),
        output: ''
      };
      content.add(inputContent);
      writingText = ''; // Clear the writing area
    }

    isGenerating = true;
    llmError = '';
    abortController = new AbortController();

    try {
      const service = new LLMService(selectedProfile);

      // Gather repository items
      const forcedItems = repositories.getForced();
      const keywordMatches = repositories.getMatchingKeywords(writingText + ' ' + contentArray.map(c => c.input + ' ' + c.output).join(' '));
      
      // Combine and deduplicate repository items
      const repositoryItems = Array.from(new Set([...forcedItems, ...keywordMatches]));
      
      // Prepare context from story content
      const options = {
        context: contentArray,
        maxContextEntries: selectedProfile.maxContextEntries,
        includeSystemContent: selectedProfile.includeSystemContent,
        signal: abortController.signal,
        repositoryItems
      };

      let responseText = '';
      
      // Create placeholder content for streaming response
      const streamingContent: ContentData = {
        type: 'llm',
        output: '',
      };
      content.add(streamingContent);

      // Get the timestamp of the added content to update it
      const addedTimestamp = Math.max(...Object.keys(content.value).map(Number));

      // Stream the response
      for await (const chunk of service.generateStream(options)) {
        responseText += chunk;
        
        // Update the content in real-time
        content.value[addedTimestamp].output = responseText;
        localStorage.setItem('content', JSON.stringify(content.value));
      }

      // Ensure final content is saved
      content.value[addedTimestamp].output = responseText;
      localStorage.setItem('content', JSON.stringify(content.value));

      // If no response was generated, show error
      if (!responseText.trim()) {
        llmError = 'No response generated from LLM';
        content.remove(addedTimestamp);
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('cancelled')) {
          llmError = 'Generation cancelled by user';
        } else if (error.message.includes('API request failed')) {
          llmError = `API Error: ${error.message}`;
        } else if (error.message.includes('fetch')) {
          llmError = 'Network error - check your connection and API endpoint';
        } else {
          llmError = error.message;
        }
      } else {
        llmError = 'An unexpected error occurred during generation';
      }

      console.error('LLM generation failed:', error);
    } finally {
      isGenerating = false;
      abortController = null;
    }
  }

  function cancelGeneration() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isGenerating = false;
  }

  function addCurrentText() {
    if (writingText.trim()) {
      const userInput: ContentData = {
        type: 'input',
        output: writingText.trim(),
      };
      content.add(userInput);
      writingText = '';
      writingArea?.focus();
    }
  }

  async function handleKeyDown(event: KeyboardEvent) {
    // CMD/CTRL + SPACE for LLM generation
    if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
      event.preventDefault();
      await generateLLMResponse();
      return;
    }

    // CMD/CTRL + ENTER to add input
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      addCurrentText();
      return;
    }

    // ESC to exit fullscreen
    if (event.key === 'Escape' && isFullscreen) {
      event.preventDefault();
      toggleFullscreen();
      return;
    }
  }

  // Get content for display
  let contentEntries = $derived(
    Object.entries(content.value)
      .map(([timestamp, data]) => ({ timestamp: parseInt(timestamp), ...data }))
      .sort((a, b) => a.timestamp - b.timestamp)
  );

  // Auto-scroll to bottom when content changes
  let contentDisplay: HTMLElement;
  $effect(() => {
    if (contentDisplay && contentEntries.length > 0) {
      setTimeout(() => {
        contentDisplay.scrollTop = contentDisplay.scrollHeight;
      }, 100);
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

<div 
  class="writer-mode h-screen flex flex-col bg-white dark:bg-gray-900"
  class:fullscreen={isFullscreen}
>
  <!-- Header Bar -->
  {#if !isFullscreen}
    <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 border-b">
      <h2 class="text-sm font-medium text-gray-700 dark:text-gray-300">Writer Mode</h2>
      <div class="flex items-center gap-2">
        <button
          onclick={() => currentPanel = currentPanel === 'controls' ? 'export' : 'controls'}
          class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          title="Toggle panel content"
        >
          {currentPanel === 'controls' ? 'Export' : 'Controls'}
        </button>
        <button
          onclick={toggleFullscreen}
          class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          title="Toggle fullscreen (ESC to exit)"
        >
          ⛶
        </button>
      </div>
    </div>
  {/if}

  <!-- Main Writing Area -->
  <div class="flex-1 flex flex-col relative">
    <!-- Content Display -->
    <div 
      bind:this={contentDisplay}
      class="content-display flex-1 p-4 overflow-y-auto space-y-4 bg-white dark:bg-gray-900"
      style="max-height: 60vh;"
    >
      {#each contentEntries as entry}
        <div class="content-entry">
          {#if entry.type === 'input' && entry.input}
            <div class="p-3 bg-blue-50 dark:bg-blue-900 rounded border-l-4 border-blue-400">
              <div class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Input</div>
              <div class="text-gray-800 dark:text-gray-200">{entry.input}</div>
            </div>
          {:else if entry.type === 'llm' && entry.output}
            <div class="p-3 bg-green-50 dark:bg-green-900 rounded border-l-4 border-green-400">
              <div class="text-sm font-medium text-green-800 dark:text-green-200 mb-1">AI Response</div>
              <div class="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{entry.output}</div>
            </div>
          {:else if entry.output}
            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded border-l-4 border-gray-400">
              <div class="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 capitalize">{entry.type}</div>
              <div class="text-gray-800 dark:text-gray-200">{entry.output}</div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Writing Input Area -->
    <div class="writing-input border-t bg-gray-50 dark:bg-gray-800">
      <!-- LLM Status -->
      <LLMIndicator 
        isGenerating={isGenerating}
        profileName={selectedProfile?.name || ''}
        error={llmError}
        onCancel={cancelGeneration}
      />

      <!-- Writing Area -->
      <textarea
        bind:this={writingArea}
        bind:value={writingText}
        onkeydown={handleKeyDown}
        class="w-full p-4 min-h-32 border-0 resize-none focus:outline-none bg-transparent text-gray-900 dark:text-gray-100"
        placeholder={selectedProfile 
          ? "Write here... Press Ctrl/Cmd+Space for AI generation, Ctrl/Cmd+Enter to add as input" 
          : "Write here... Configure an LLM profile in settings to use AI generation"
        }
      ></textarea>

      <!-- Controls Bar -->
      <div class="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 text-sm">
        <div class="flex items-center gap-4">
          {#if selectedProfile}
            <span class="text-green-600 dark:text-green-400">✓ {selectedProfile.name}</span>
          {:else}
            <span class="text-orange-600 dark:text-orange-400">⚠ No LLM Profile</span>
          {/if}
          
          <span class="text-gray-600 dark:text-gray-400">
            {writingText.length} chars
          </span>
        </div>
        
        <div class="flex gap-2">
          <button
            onclick={addCurrentText}
            disabled={!writingText.trim()}
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Input
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Floating Control Panel -->
  <FloatingPanel
    title={currentPanel === 'controls' ? 'Story Controls' : 'Export Tools'}
    bind:position={panelPosition}
    bind:size={panelSize}
    minSize={{ width: 280, height: 400 }}
    maxSize={{ width: 500, height: 700 }}
  >
    {#snippet children()}
      <div class="h-full overflow-y-auto">
        {#if currentPanel === 'controls'}
          <!-- Profile Selection -->
          {#if Object.keys(profiles.value).length > 0}
            <div class="p-3 border-b">
              <label class="block text-sm font-medium mb-2">LLM Profile</label>
              <select bind:value={selectedProfileKey} class="w-full text-sm p-2 border rounded">
                <option value="">No LLM Profile</option>
                {#each Object.entries(profiles.value) as [key, profile]}
                  <option value={key}>{profile.name}</option>
                {/each}
              </select>
            </div>
          {/if}
          
          <!-- Story Controls -->
          <div class="p-3">
            <Sidebar />
          </div>
        {:else}
          <!-- Export Tools -->
          <ExportUtilities />
        {/if}
      </div>
    {/snippet}
  </FloatingPanel>
</div>

<style>
  .writer-mode.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
  }
  
  .content-entry {
    animation: fadeIn 0.3s ease-in;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>