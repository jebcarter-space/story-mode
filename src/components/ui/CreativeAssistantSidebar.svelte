<script lang="ts">
  import { createCreativeAssistant } from '../../data/models/creative-assistant.svelte.ts';
  import { createLLMProfiles } from '../../data/models/llm-profiles.svelte.ts';
  import { createRepositories } from '../../data/models/repositories.svelte.ts';
  import { createWorkbooks } from '../../data/models/workbooks.svelte.ts';
  import { CreativeService } from '../../lib/creative-service';
  import { StoryContextService } from '../../lib/story-context';
  import { getRepositoryContext } from '../../lib/repository-context';
  import type { CreativeMessage } from '../../data/types';

  // Props
  let { isOpen = $bindable(false), isDocked = $bindable(true) } = $props();

  // State management
  const creativeSessions = createCreativeAssistant();
  const profiles = createLLMProfiles();
  const repositories = createRepositories();
  const workbooks = createWorkbooks();

  // Get current context
  let repositoryContext = $derived(getRepositoryContext());
  let contextService = $derived(new StoryContextService(repositories, workbooks));
  let storyContext = $derived(contextService.getStoryContext(repositoryContext));
  let contextId = $derived(contextService.getContextId(repositoryContext));

  // UI state
  let currentMessage = $state('');
  let isGenerating = $state(false);
  let selectedProfileKey = $state(localStorage.getItem('creative-assistant-profile') || '');
  let currentMode = $state<'creative' | 'secretary' | 'gm' | 'brainstorm'>('creative');
  let showPrompts = $state(false);
  let abortController: AbortController | null = null;

  // Selected LLM profile
  let selectedProfile = $derived(
    selectedProfileKey ? profiles.value[selectedProfileKey] : null
  );

  let creativeService = $derived(
    selectedProfile ? new CreativeService(selectedProfile) : null
  );

  // Current session
  let activeSession = $derived(creativeSessions.activeSession);
  let hasActiveSession = $derived(!!activeSession);

  // Auto-create or switch session based on context
  $effect(() => {
    if (contextId && (!activeSession || activeSession.contextId !== contextId)) {
      const existingSessions = creativeSessions.getSessionsByContext(contextId);
      if (existingSessions.length > 0) {
        // Use the most recent session
        const mostRecent = existingSessions.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        creativeSessions.setActiveSession(mostRecent.id);
      } else {
        // Create new session for this context
        creativeSessions.startSession(contextId, currentMode);
      }
    }
  });

  // Save selected profile
  $effect(() => {
    if (selectedProfileKey) {
      localStorage.setItem('creative-assistant-profile', selectedProfileKey);
    }
  });

  // Available prompts for current mode
  let availablePrompts = $derived(
    creativeService ? creativeService.getCreativePrompts(currentMode) : []
  );

  async function sendMessage() {
    if (!currentMessage.trim() || !selectedProfile || !creativeService || !hasActiveSession) return;

    const userMessage: CreativeMessage = {
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    // Add user message
    creativeSessions.addMessage(userMessage);
    
    const messageToSend = currentMessage;
    currentMessage = '';
    isGenerating = true;
    abortController = new AbortController();

    try {
      let assistantResponse = '';

      // Create assistant message placeholder
      const assistantMessage: CreativeMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      creativeSessions.addMessage(assistantMessage);

      // Generate response
      const options = {
        mode: currentMode,
        conversation: activeSession!.conversation,
        repositoryItems: storyContext.availableRepositoryItems,
        signal: abortController.signal,
        contextId
      };

      for await (const chunk of creativeService.generateResponse(options)) {
        assistantResponse += chunk;
        
        // Update the last message (assistant response) in real-time
        if (activeSession) {
          const lastMessage = activeSession.conversation[activeSession.conversation.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = assistantResponse;
            // Trigger reactivity by updating the sessions
            creativeSessions.sessions[creativeSessions.activeSessionId!].updatedAt = new Date();
          }
        }
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        console.log('Generation cancelled');
      } else {
        console.error('Creative assistant error:', error);
        creativeSessions.addMessage({
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        });
      }
    } finally {
      isGenerating = false;
      abortController = null;
    }
  }

  function cancelGeneration() {
    if (abortController) {
      abortController.abort();
    }
  }

  function changeMode(newMode: 'creative' | 'secretary' | 'gm' | 'brainstorm') {
    currentMode = newMode;
    if (hasActiveSession) {
      creativeSessions.changeMode(newMode);
    }
  }

  function usePrompt(prompt: string) {
    currentMessage = prompt;
    showPrompts = false;
  }

  function clearSession() {
    if (hasActiveSession) {
      creativeSessions.deleteSession(activeSession!.id);
    }
  }

  // Handle keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  // Mode display info
  const modeInfo = {
    creative: { icon: '💭', name: 'Creative', color: 'text-purple-600 dark:text-purple-400' },
    secretary: { icon: '📝', name: 'Secretary', color: 'text-blue-600 dark:text-blue-400' },
    gm: { icon: '🎭', name: 'GameMaster', color: 'text-red-600 dark:text-red-400' },
    brainstorm: { icon: '🎲', name: 'Brainstorm', color: 'text-green-600 dark:text-green-400' }
  };
</script>

<div class="creative-assistant-sidebar {isDocked ? 'docked' : 'floating'}" class:open={isOpen}>
  <!-- Header -->
  <div class="header p-3 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-lg">{modeInfo[currentMode].icon}</span>
        <span class="font-medium text-gray-900 dark:text-gray-100">Creative Assistant</span>
      </div>
      <div class="flex items-center gap-1">
        {#if isDocked}
          <button
            onclick={() => isOpen = !isOpen}
            class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? '◀' : '▶'}
          </button>
        {:else}
          <button
            onclick={() => isOpen = false}
            class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Close"
          >
            ✕
          </button>
        {/if}
      </div>
    </div>
  </div>

  {#if isOpen}
    <!-- Context Info -->
    <div class="context-info p-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">
      <div class="flex items-center justify-between">
        <span>Context: {storyContext.contextDescription}</span>
        <span class="{modeInfo[currentMode].color}">
          {modeInfo[currentMode].name}
        </span>
      </div>
    </div>

    <!-- Mode Selection -->
    <div class="mode-selection p-2 border-b border-gray-300 dark:border-gray-600">
      <div class="flex gap-1">
        {#each Object.entries(modeInfo) as [mode, info]}
          <button
            onclick={() => changeMode(mode as any)}
            class="mode-btn {currentMode === mode ? 'active' : ''}"
            title={info.name}
          >
            <span class="text-sm">{info.icon}</span>
            <span class="text-xs hidden sm:inline">{info.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- LLM Profile Selection -->
    {#if Object.keys(profiles.value).length > 0}
      <div class="profile-selection p-2 border-b border-gray-300 dark:border-gray-600">
        <select 
          bind:value={selectedProfileKey} 
          class="w-full text-xs p-1 border rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        >
          <option value="">No LLM Profile</option>
          {#each Object.entries(profiles.value) as [key, profile]}
            <option value={key}>{profile.name}</option>
          {/each}
        </select>
      </div>
    {:else}
      <div class="p-2 text-xs text-gray-600 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">
        <p>No LLM profiles configured. <a href="/settings" class="text-blue-600 dark:text-blue-400">Add one</a> to use the assistant.</p>
      </div>
    {/if}

    <!-- Conversation -->
    <div class="conversation flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 dark:bg-gray-800">
      {#if hasActiveSession && activeSession.conversation.length > 0}
        {#each activeSession.conversation as message}
          <div class="message {message.role}">
            <div class="message-content">
              <div class="message-role text-xs text-gray-600 dark:text-gray-300 mb-1">
                {message.role === 'user' ? 'You' : modeInfo[currentMode].icon + ' Assistant'}
              </div>
              <div class="message-text text-sm text-gray-900 dark:text-gray-100">
                {message.content}
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <div class="empty-state text-center py-8">
          <div class="text-4xl mb-2">{modeInfo[currentMode].icon}</div>
          <div class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Start a conversation with your creative assistant
          </div>
          <button
            onclick={() => showPrompts = !showPrompts}
            class="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            💡 Get Ideas
          </button>
        </div>
      {/if}

      {#if isGenerating}
        <div class="generating-indicator flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <div class="spinner"></div>
          <span>Assistant is thinking...</span>
          <button onclick={cancelGeneration} class="cancel-btn text-red-600 hover:text-red-700">
            Cancel
          </button>
        </div>
      {/if}
    </div>

    <!-- Quick Prompts -->
    {#if showPrompts && availablePrompts.length > 0}
      <div class="prompts p-2 border-t border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
        <div class="text-xs text-gray-600 dark:text-gray-300 mb-2">Quick Ideas:</div>
        <div class="space-y-1">
          {#each availablePrompts as prompt}
            <button
              onclick={() => usePrompt(prompt)}
              class="prompt-btn w-full text-left text-xs p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {prompt}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Input Area -->
    <div class="input-area p-2 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
      <div class="flex gap-2">
        <textarea
          bind:value={currentMessage}
          onkeydown={handleKeydown}
          placeholder="Share an idea..."
          class="flex-1 text-sm p-2 border rounded resize-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          rows="2"
          disabled={!selectedProfile || isGenerating}
        ></textarea>
        <div class="flex flex-col gap-1">
          <button
            onclick={sendMessage}
            disabled={!currentMessage.trim() || !selectedProfile || isGenerating}
            class="send-btn px-3 py-1 rounded text-sm disabled:opacity-50"
            title="Send message"
          >
            {isGenerating ? '⏸' : '📤'}
          </button>
          <button
            onclick={() => showPrompts = !showPrompts}
            class="prompt-toggle-btn px-3 py-1 rounded text-sm"
            title="Show prompts"
          >
            💡
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions flex justify-between items-center mt-2">
        <div class="flex gap-1">
          <button onclick={() => showPrompts = !showPrompts} class="action-btn" title="Ideas">
            💡
          </button>
          <button onclick={() => {}} class="action-btn" title="Save idea">
            📝
          </button>
          <button onclick={() => {}} class="action-btn" title="Add reminder">
            🔔
          </button>
        </div>
        {#if hasActiveSession}
          <button onclick={clearSession} class="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
            Clear
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .creative-assistant-sidebar {
    @apply flex flex-col bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600;
    height: 100vh;
    width: 320px;
    border-left: 1px solid rgb(209 213 219 / 1);
  }
  
  .dark .creative-assistant-sidebar {
    border-left-color: rgb(75 85 99 / 1);
  }

  .creative-assistant-sidebar.docked {
    @apply relative;
  }

  .creative-assistant-sidebar.floating {
    @apply fixed top-0 right-0 z-50 shadow-lg;
  }

  .creative-assistant-sidebar:not(.open) {
    width: 48px;
  }

  .creative-assistant-sidebar:not(.open) .header {
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }

  .mode-btn {
    @apply flex items-center gap-1 px-2 py-1 rounded text-xs border;
    @apply border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors;
  }

  .mode-btn.active {
    @apply bg-blue-600 text-white border-transparent;
  }

  .message {
    @apply rounded p-2;
  }

  .message.user {
    @apply bg-gray-100 dark:bg-gray-700 ml-4;
  }

  .message.assistant {
    @apply bg-blue-50 dark:bg-blue-900/20 mr-4;
  }

  .send-btn {
    @apply bg-blue-600 text-white hover:bg-blue-700;
  }

  .prompt-toggle-btn, .action-btn {
    @apply bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500;
  }

  .spinner {
    @apply w-3 h-3 border border-gray-300 border-t-transparent rounded-full;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .cancel-btn {
    @apply underline cursor-pointer;
  }
</style>