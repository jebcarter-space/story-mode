<script lang="ts" module>
  import { content } from "../../App.svelte";
  import { createInput } from "../../data/models/input.svelte";
  import { createLLMProfiles } from "../../data/models/llm-profiles.svelte";
  import { createRepositories } from "../../data/models/repositories.svelte";
  import type { ContentData } from "../../data/types";
  import { addInput, getAnswer } from "./functions";
  import { LLMService, type TokenCountInfo } from "../../lib/llm-service";
  import LLMIndicator from "./LLMIndicator.svelte";

  export let input = createInput();
</script>

<script lang="ts">
  let question = $state('');
  let cleared = $derived(input.cleared);
  
  let profiles = createLLMProfiles();
  let repositories = createRepositories();
  let selectedProfileKey = $state(localStorage.getItem('selected-llm-profile') || '');
  let isGenerating = $state(false);
  let llmError = $state('');
  let abortController: AbortController | null = null;
  let tokenInfo = $state<TokenCountInfo | undefined>(undefined);

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
      question = '';
      input.emptied();
    }
  });

  $effect(() => {
    // Save selected profile to localStorage when it changes
    if (selectedProfileKey) {
      localStorage.setItem('selected-llm-profile', selectedProfileKey);
    }
  });

  function changeInput() {
    input.update(question);
  }

  async function generateLLMResponse() {
    if (!selectedProfile) {
      llmError = 'No LLM profile selected';
      return;
    }

    isGenerating = true;
    llmError = '';
    abortController = new AbortController();

    try {
      const service = new LLMService(selectedProfile);
      
      // Gather repository items
      const forcedItems = repositories.getForced();
      const keywordMatches = repositories.getMatchingKeywords(question + ' ' + contentArray.map(c => c.input + ' ' + c.output).join(' '));
      
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

  async function handleKeyDown(event: KeyboardEvent) {
    if(event.key === 'Enter') {
      if(event.shiftKey) {
        // do nothing allow enter to pass through
      }
      else if (event.ctrlKey || event.metaKey) {
        getAnswer();
        event.preventDefault();
      }
      else {
        // Check if input is empty and we have a selected profile for LLM generation
        if (question.trim() === '' && selectedProfile) {
          await generateLLMResponse();
          event.preventDefault();
        } else {
          addInput();
          event.preventDefault();
        }
      }
    }
  }

  // Update token count when content or profile changes
  async function updateTokenCount() {
    if (!selectedProfile) {
      tokenInfo = undefined;
      return;
    }

    try {
      const service = new LLMService(selectedProfile);
      
      // Get forced repository items
      const allRepoItems = Object.entries(repositories.value)
        .map(([key, item]) => item)
        .filter(item => item.forceInContext);

      const options = {
        context: contentArray,
        maxContextEntries: selectedProfile.maxContextEntries,
        includeSystemContent: selectedProfile.includeSystemContent,
        repositoryItems: allRepoItems
      };

      tokenInfo = await service.getContextTokenCount(options);
    } catch (error) {
      console.warn('Failed to update token count:', error);
      tokenInfo = undefined;
    }
  }

  // Update token count when relevant data changes
  $effect(() => {
    if (selectedProfile && contentArray) {
      updateTokenCount();
    }
  });
</script>

<!-- Profile Selection and Status -->
{#if Object.keys(profiles.value).length > 0}
  <div class="mb-2 flex items-center gap-2">
    <select bind:value={selectedProfileKey} class="text-xs p-1 border rounded">
      <option value="">No LLM Profile</option>
      {#each Object.entries(profiles.value) as [key, profile]}
        <option value={key}>{profile.name}</option>
      {/each}
    </select>
    {#if selectedProfile}
      <span class="text-xs text-gray-600">
        Empty + Enter to generate
      </span>
    {/if}
  </div>
{/if}

<!-- LLM Generation Status -->
<LLMIndicator 
  isGenerating={isGenerating}
  profileName={selectedProfile?.name || ''}
  error={llmError}
  onCancel={cancelGeneration}
  tokenInfo={tokenInfo}
/>

<textarea
  id="question"
  bind:value={question}
  oninput={changeInput}
  onkeydown={handleKeyDown}
  class="w-full px-3 py-2 h-[60px]"
  placeholder={selectedProfile && question.trim() === '' ? 
    "Enter text or press Enter for LLM generation" : 
    "Question, task or text"
  }
></textarea>