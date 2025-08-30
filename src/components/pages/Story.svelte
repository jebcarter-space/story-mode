<script lang="ts">
	import Sidebar from './../story-mode/Sidebar.svelte';
  import Content from '../story-mode/Content.svelte';
  import Input from '../story-mode/Input.svelte';
  import WriterMode from '../story-mode/WriterMode.svelte';
  import Header from '../ui/Header.svelte';
  import { createAppConfig } from '../../data/models/app-config.svelte';

  const appConfig = createAppConfig();
  let isWriterMode = $state(localStorage.getItem('story-writer-mode') === 'true');

  // Save writer mode preference to localStorage
  $effect(() => {
    localStorage.setItem('story-writer-mode', isWriterMode.toString());
  });
</script>

<Header />

{#if appConfig.features.writerMode}
  <div class="mb-2 flex items-center justify-between">
    <div></div>
    <button
      onclick={() => isWriterMode = !isWriterMode}
      class="px-3 py-1 text-xs {isWriterMode ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700'} rounded hover:opacity-80"
      title="Toggle Writer Mode"
    >
      {isWriterMode ? '✍️ Writer Mode' : '📝 Standard Mode'}
    </button>
  </div>
{/if}

{#if appConfig.features.writerMode && isWriterMode}
  <WriterMode />
{:else}
  <Content />
  <div class="flex flex-col gap-2">
    <Sidebar />
    <Input />
  </div>
{/if}
