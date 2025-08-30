<script lang="ts">
  import Page from "../ui/Page.svelte";
  import { settingPages } from "../../data/setting-pages";
  import { createAppConfig } from "../../data/models/app-config.svelte";

  const appConfig = createAppConfig();

  let value = $state('Settings');

  let filteredPages = $derived.by(() => {
    const pages = [settingPages[0], settingPages[1], settingPages[2]]; // Always show Settings, Feature Toggles, and Theme
    
    if (appConfig.features.enhancedTables) {
      pages.push(settingPages[3]); // Custom Tables
    }
    
    if (appConfig.features.templates) {
      pages.push(settingPages[4]); // Templates
    }
    
    if (appConfig.features.llmIntegration) {
      pages.push(settingPages[5]); // LLM Settings
    }
    
    return pages;
  });

  let blocks = $derived(filteredPages.map(page => page.component));
  let index = $derived(filteredPages.findIndex(page => page.name === value));

  let Block = $derived(blocks[index]);

  // Reset to Settings if current page becomes unavailable
  $effect(() => {
    if (index === -1) {
      value = 'Settings';
    }
  });
</script>

<Page back="/">
  <h3 class="text-3xl font-bold mb-3">Settings</h3>

  <select bind:value={value} class="w-full border">
    {#each filteredPages as page}
      <option value={page.name}>{page.name}</option>
    {/each}
  </select>

  <Block />
</Page>