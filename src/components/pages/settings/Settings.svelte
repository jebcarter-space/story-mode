<script lang="ts">
  import SettingPage from "../../ui/SettingPage.svelte";
  import { createAppConfig } from "../../../data/models/app-config.svelte";

  const appConfig = createAppConfig();
  
  let exportData = '';
  let importData = '';
  let showExport = false;
  let showImport = false;
  let importMessage = '';

  function openExport() {
    exportData = appConfig.exportConfig();
    showExport = true;
    showImport = false;
  }

  function openImport() {
    importData = '';
    importMessage = '';
    showImport = true;
    showExport = false;
  }

  function handleImport() {
    const success = appConfig.importConfig(importData);
    if (success) {
      importMessage = '✅ Configuration imported successfully!';
      importData = '';
      setTimeout(() => {
        showImport = false;
        importMessage = '';
      }, 2000);
    } else {
      importMessage = '❌ Invalid configuration format. Please check the JSON.';
    }
  }

  function handleReset() {
    if (confirm('Reset all configuration to defaults? This will reset all feature toggles and settings.')) {
      appConfig.reset();
    }
  }

  function closeDialogs() {
    showExport = false;
    showImport = false;
    importMessage = '';
  }
</script>

<SettingPage>
  <h3 class="text-3xl font-bold mb-3">Configuration Management</h3>
  <p class="text-gray-600 mb-6">
    Manage your app configuration including feature toggles and other settings.
  </p>

  <!-- Action Buttons -->
  <div class="flex gap-3 mb-6">
    <button
      onclick={openExport}
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    >
      Export Configuration
    </button>
    <button
      onclick={openImport}
      class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
    >
      Import Configuration
    </button>
    <button
      onclick={handleReset}
      class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
    >
      Reset to Defaults
    </button>
  </div>

  <!-- Export Dialog -->
  {#if showExport}
    <div class="mb-6 p-4 border rounded-lg bg-blue-50">
      <div class="flex justify-between items-center mb-3">
        <h4 class="text-lg font-semibold">Export Configuration</h4>
        <button
          onclick={closeDialogs}
          class="text-gray-500 hover:text-gray-700 text-xl"
          title="Close"
        >
          ×
        </button>
      </div>
      <p class="text-sm text-gray-600 mb-3">
        Copy this configuration to backup or share your settings:
      </p>
      <textarea
        readonly
        bind:value={exportData}
        class="w-full p-3 border rounded bg-white font-mono text-sm h-40"
      ></textarea>
      <div class="flex gap-2 mt-3">
        <button
          onclick={() => navigator.clipboard.writeText(exportData)}
          class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  {/if}

  <!-- Import Dialog -->
  {#if showImport}
    <div class="mb-6 p-4 border rounded-lg bg-green-50">
      <div class="flex justify-between items-center mb-3">
        <h4 class="text-lg font-semibold">Import Configuration</h4>
        <button
          onclick={closeDialogs}
          class="text-gray-500 hover:text-gray-700 text-xl"
          title="Close"
        >
          ×
        </button>
      </div>
      <p class="text-sm text-gray-600 mb-3">
        Paste your configuration JSON here to restore settings:
      </p>
      <textarea
        bind:value={importData}
        placeholder="Paste your configuration JSON here..."
        class="w-full p-3 border rounded font-mono text-sm h-40"
      ></textarea>
      {#if importMessage}
        <div class="mt-2 text-sm" class:text-green-600={importMessage.includes('✅')} class:text-red-600={importMessage.includes('❌')}>
          {importMessage}
        </div>
      {/if}
      <div class="flex gap-2 mt-3">
        <button
          onclick={handleImport}
          disabled={!importData.trim()}
          class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Import Configuration
        </button>
      </div>
    </div>
  {/if}

  <!-- Current Configuration Info -->
  <div class="p-4 bg-gray-50 rounded-lg">
    <h4 class="text-lg font-semibold mb-3">Current Configuration</h4>
    <div class="space-y-2 text-sm">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <strong>Version:</strong> {appConfig.value.version}
        </div>
        <div>
          <strong>Last Updated:</strong> {new Date(appConfig.value.lastUpdated).toLocaleString()}
        </div>
      </div>
      <div class="mt-4">
        <strong>Feature Status:</strong>
        <div class="ml-4 mt-2 space-y-1">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" class:bg-green-500={appConfig.features.enhancedTables} class:bg-gray-400={!appConfig.features.enhancedTables}></span>
            Enhanced Tables: {appConfig.features.enhancedTables ? 'Enabled' : 'Disabled'}
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" class:bg-green-500={appConfig.features.templates} class:bg-gray-400={!appConfig.features.templates}></span>
            Templates: {appConfig.features.templates ? 'Enabled' : 'Disabled'}
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" class:bg-green-500={appConfig.features.llmIntegration} class:bg-gray-400={!appConfig.features.llmIntegration}></span>
            LLM Integration: {appConfig.features.llmIntegration ? 'Enabled' : 'Disabled'}
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" class:bg-green-500={appConfig.features.writerMode} class:bg-gray-400={!appConfig.features.writerMode}></span>
            Writer Mode: {appConfig.features.writerMode ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>
    </div>
  </div>
</SettingPage>