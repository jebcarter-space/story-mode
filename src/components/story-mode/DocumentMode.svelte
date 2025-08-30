<script lang="ts" module>
  import { content } from "../../App.svelte";
  import { createInput } from "../../data/models/input.svelte";
  import { createLLMProfiles } from "../../data/models/llm-profiles.svelte";
  import { createRepositories } from "../../data/models/repositories.svelte";
  import type { ContentData } from "../../data/types";
  import { LLMService } from "../../lib/llm-service";

  export let input = createInput();
</script>

<script lang="ts">
  import LLMIndicator from './LLMIndicator.svelte';
  
  // Props from parent WriterMode
  let { 
    showSystemContent = $bindable(),
    focusMode = $bindable(),
    typewriterMode = $bindable(),
    isFullscreen = $bindable()
  }: {
    showSystemContent: boolean;
    focusMode: boolean;
    typewriterMode: boolean;
    isFullscreen: boolean;
  } = $props();
  
  let documentArea: HTMLElement;
  let documentText = $state('');
  let cursorPosition = $state(0);
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

  // Generate document text from content
  let generatedDocumentText = $derived.by(() => {
    let text = '';
    
    for (const entry of contentArray) {
      // Skip system content if hidden
      if (!showSystemContent && (entry.type === 'oracle' || entry.type === 'roll' || entry.type === 'table' || entry.type === 'template')) {
        continue;
      }
      
      // Add content based on type
      if (entry.type === 'input' && entry.output?.trim()) {
        text += entry.output.trim() + '\n\n';
      } else if (entry.type === 'llm' && entry.output?.trim()) {
        text += entry.output.trim() + '\n\n';
      } else if (showSystemContent && entry.output?.trim()) {
        // System content with prefix when visible
        text += `[${entry.type.toUpperCase()}] ${entry.output.trim()}\n\n`;
      }
    }
    
    return text.trim();
  });

  // Sync document text with generated text
  $effect(() => {
    if (generatedDocumentText !== documentText) {
      documentText = generatedDocumentText;
    }
  });

  $effect(() => {
    if(cleared) {
      documentText = '';
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

    // Parse the current document text to find new content to add as input
    const newContent = parseNewContent();
    if (newContent.trim()) {
      const inputContent: ContentData = {
        type: 'input',
        input: newContent.trim(),
        output: newContent.trim()
      };
      content.add(inputContent);
    }

    isGenerating = true;
    llmError = '';
    abortController = new AbortController();

    try {
      const service = new LLMService(selectedProfile);

      // Gather repository items
      const forcedItems = repositories.getForced();
      const keywordMatches = repositories.getMatchingKeywords(documentText + ' ' + contentArray.map(c => c.input + ' ' + c.output).join(' '));
      
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

  function parseNewContent(): string {
    // Simple implementation: return content that's after the last generated content
    const currentGenerated = generatedDocumentText;
    if (documentText.length > currentGenerated.length && documentText.startsWith(currentGenerated)) {
      return documentText.substring(currentGenerated.length).trim();
    }
    return '';
  }

  function cancelGeneration() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isGenerating = false;
  }

  function setPanelLocation(location: 'left' | 'right' | 'bottom') {
    panelLocation = location;
    
    // Update panel position based on location
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    switch (location) {
      case 'left':
        panelPosition = { x: 20, y: 100 };
        panelSize = { width: 320, height: Math.min(500, windowHeight - 200) };
        break;
      case 'right':
        panelPosition = { x: windowWidth - 340, y: 100 };
        panelSize = { width: 320, height: Math.min(500, windowHeight - 200) };
        break;
      case 'bottom':
        panelPosition = { x: 20, y: windowHeight - 220 };
        panelSize = { width: Math.min(600, windowWidth - 40), height: 200 };
        break;
    }
  }

  async function handleKeyDown(event: KeyboardEvent) {
    // CMD/CTRL + ENTER for LLM generation
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      await generateLLMResponse();
      return;
    }
  }

  function handleDocumentInput(event: Event) {
    // Update document text from input event
    const target = event.target as HTMLTextAreaElement;
    documentText = target.value;
    
    // Update cursor position
    if (documentArea) {
      cursorPosition = documentArea.selectionStart || 0;
    }
  }

  // Auto-scroll functionality for typewriter mode
  $effect(() => {
    if (typewriterMode && documentArea) {
      // Keep current line centered
      const lineHeight = parseInt(getComputedStyle(documentArea).lineHeight) || 20;
      const containerHeight = documentArea.clientHeight;
      const targetScroll = Math.max(0, documentArea.scrollTop - (containerHeight / 2) + lineHeight);
      documentArea.scrollTop = targetScroll;
    }
  });

  // Word count calculation
  let wordCount = $derived.by(() => {
    if (!documentText) return 0;
    return documentText.trim().split(/\s+/).filter(word => word.length > 0).length;
  });

  let characterCount = $derived.by(() => documentText.length);
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- Main Document Area -->
  <div class="flex-1 flex flex-col relative">
    <!-- LLM Status -->
    <LLMIndicator 
      isGenerating={isGenerating}
      profileName={selectedProfile?.name || ''}
      error={llmError}
      onCancel={cancelGeneration}
    />

    <!-- Document Editor -->
    <div class="flex-1 relative">
      <textarea
        bind:this={documentArea}
        bind:value={documentText}
        oninput={handleDocumentInput}
        onkeydown={handleKeyDown}
        class="document-editor w-full h-full p-8 border-0 resize-none focus:outline-none bg-transparent text-gray-900 dark:text-gray-100"
        class:focus-mode={focusMode}
        class:typewriter-mode={typewriterMode}
        placeholder={selectedProfile 
          ? "Start writing your story here... Press Ctrl/Cmd+Enter to generate AI response" 
          : "Start writing your story here... Configure an LLM profile in settings to use AI generation"
        }
        style="font-family: 'Georgia', 'Times New Roman', serif; font-size: 16px; line-height: 1.6;"
      ></textarea>
    </div>

    <!-- Status Bar -->
    {#if !isFullscreen}
      <div class="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 text-sm border-t">
        <div class="flex items-center gap-4">
          {#if selectedProfile}
            <span class="text-green-600 dark:text-green-400">✓ {selectedProfile.name}</span>
          {:else}
            <span class="text-orange-600 dark:text-orange-400">⚠ No LLM Profile</span>
          {/if}
          
          <span class="text-gray-600 dark:text-gray-400">
            {wordCount} words • {characterCount} chars
          </span>
          
          {#if showSystemContent}
            <span class="text-blue-600 dark:text-blue-400">System Content Visible</span>
          {:else}
            <span class="text-gray-500">Clean Document View</span>
          {/if}
        </div>
        
        <div class="flex gap-2">
          <span class="text-xs text-gray-500">
            Ctrl/Cmd+Enter: Generate • Ctrl/Cmd+1: System • Ctrl/Cmd+2: Focus • Ctrl/Cmd+3: Typewriter
          </span>
        </div>
      </div>
    {/if}
  </div>

<style>
  .document-editor {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 16px;
    line-height: 1.6;
    transition: all 0.3s ease;
  }
  
  .document-mode.focus-mode .document-editor {
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.1) 0%,
      rgba(0, 0, 0, 0) 40%,
      rgba(0, 0, 0, 0) 60%,
      rgba(0, 0, 0, 0.1) 100%
    );
  }
  
  .document-editor.typewriter-mode {
    padding-top: 50vh;
    padding-bottom: 50vh;
  }
  
  /* Smooth content transitions */
  .document-editor {
    transition: all 0.3s ease;
  }
</style>