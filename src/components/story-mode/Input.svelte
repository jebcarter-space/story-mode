<script lang="ts" module>
  import { content } from "../../App.svelte";
  import { createInput } from "../../data/models/input.svelte";
  import { createLLMProfiles } from "../../data/models/llm-profiles.svelte";
  import { createRepositories } from "../../data/models/repositories.svelte";
  import type { ContentData } from "../../data/types";
  import { addInput, getAnswer } from "./functions";
  import { LLMService, type TokenCountInfo } from "../../lib/llm-service";
  import LLMIndicator from "./LLMIndicator.svelte";
  import { createWorkbooks } from "../../data/models/workbooks.svelte";
  import { createRepositoryResolver } from "../../lib/repository-resolver.ts";
  import type { RepositoryContext } from "../../data/types";
  import ContextIndicator from "../ui/ContextIndicator.svelte";
  import { getRepositoryContext } from "../../lib/repository-context";

  export let input = createInput();
</script>

<script lang="ts">
  let question = $state('');
  let cleared = $derived(input.cleared);
  
  let profiles = createLLMProfiles();
  let repositories = createRepositories();
  let workbooks = createWorkbooks();
  let selectedProfileKey = $state(localStorage.getItem('selected-llm-profile') || '');
  
  // Repository context from provider (library navigation)
  let repositoryContext = $derived(getRepositoryContext());
  let isGenerating = $state(false);
  let llmError = $state('');
  let abortController: AbortController | null = null;
  let tokenInfo = $state<TokenCountInfo | undefined>(undefined);
  let conflictWarnings = $state<string[]>([]);

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
      
      // Create repository resolver with current context and workbooks
      const resolver = createRepositoryResolver(
        repositories.value, 
        workbooks.getAllWorkbooks(),
        repositoryContext
      );
      
      // Gather repository items with conflict resolution
      const forcedItems = repositories.getForced();
      const queryText = question + ' ' + contentArray.map(c => c.input + ' ' + c.output).join(' ');
      const keywordResolutions = resolver.getMatchingKeywords(queryText);
      
      // Extract items from resolutions and show conflict warnings
      const keywordMatchItems: RepositoryItem[] = [];
      const newConflictWarnings: string[] = [];
      
      for (const resolution of keywordResolutions) {
        keywordMatchItems.push(...resolution.items.map(r => r.item));
        
        if (resolution.hasConflicts) {
          const sourceLabels = resolution.items.map(r => `${r.source}: ${r.item.name}`).join(', ');
          newConflictWarnings.push(`Keyword "${resolution.keyword}" found in multiple sources: ${sourceLabels}. Content will be concatenated.`);
        }
      }
      
      // Update conflict warnings state
      conflictWarnings = newConflictWarnings;
      if (conflictWarnings.length > 0) {
        console.warn('Repository keyword conflicts detected:', conflictWarnings);
        // Clear warnings after 5 seconds
        setTimeout(() => {
          conflictWarnings = [];
        }, 5000);
      }
      
      // Combine and deduplicate repository items
      const repositoryItems = Array.from(new Set([...forcedItems, ...keywordMatchItems]));
      
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
      
      // Create repository resolver and get forced items with scoping
      const resolver = createRepositoryResolver(
        repositories.value, 
        workbooks.getAllWorkbooks(),
        repositoryContext
      );
      
      const allRepoItems = resolver.getItemsInScope()
        .filter(resolved => resolved.item.forceInContext)
        .map(resolved => resolved.item);

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

<!-- Repository Context Indicator -->
<div class="mb-2">
  <ContextIndicator context={repositoryContext} compact={true} />
</div>

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
      <span class="text-xs theme-text-muted">
        Empty + Enter to generate
      </span>
    {/if}
  </div>
{/if}

<!-- Conflict Warnings -->
{#if conflictWarnings.length > 0}
  <div class="mb-2 p-2 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded text-sm">
    <div class="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
      ⚠️ Repository Keyword Conflicts
    </div>
    {#each conflictWarnings as warning}
      <div class="text-yellow-700 dark:text-yellow-300 text-xs">{warning}</div>
    {/each}
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