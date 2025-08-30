<script lang="ts">
	import Sidebar from './../story-mode/Sidebar.svelte';
  import Content from '../story-mode/Content.svelte';
  import Input from '../story-mode/Input.svelte';
  import DocumentMode from '../story-mode/DocumentMode.svelte';
  import Header from '../ui/Header.svelte';
  import { createAppConfig } from '../../data/models/app-config.svelte';

  const appConfig = createAppConfig();
  
  // Migration: handle old 'story-writer-mode' localStorage key
  let isDocumentMode = $state((() => {
    const newKey = localStorage.getItem('story-document-mode');
    if (newKey !== null) {
      return newKey === 'true';
    }
    // Check for old key and migrate
    const oldKey = localStorage.getItem('story-writer-mode');
    if (oldKey !== null) {
      const value = oldKey === 'true';
      localStorage.setItem('story-document-mode', value.toString());
      localStorage.removeItem('story-writer-mode'); // Clean up old key
      return value;
    }
    return false; // Default to Game Mode
  })());

  // Save document mode preference to localStorage
  $effect(() => {
    localStorage.setItem('story-document-mode', isDocumentMode.toString());
  });
</script>

<Header />

{#if appConfig.features.documentMode}
  <div class="mb-2 flex items-center justify-between">
    <div></div>
    <button
      onclick={() => isDocumentMode = !isDocumentMode}
      class="px-3 py-1 text-xs {isDocumentMode ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700'} rounded hover:opacity-80"
      title="Toggle Document Mode"
    >
      {isDocumentMode ? '📄 Document Mode' : '🎮 Game Mode'}
    </button>
  </div>
{/if}

{#if appConfig.features.documentMode && isDocumentMode}
  <DocumentMode />
{:else}
  <Content />
  <div class="flex flex-col gap-2">
    <Sidebar />
    <Input />
  </div>
{/if}
