<script lang="ts">
  import SettingPage from "../../ui/SettingPage.svelte";
  import { createAppConfig } from "../../../data/models/app-config.svelte";

  const appConfig = createAppConfig();

  function handleToggle(feature: keyof typeof appConfig.features) {
    appConfig.toggleFeature(feature);
  }
</script>

<SettingPage>
  <h3 class="text-3xl font-bold mb-3">Feature Toggles</h3>
  <p class="text-gray-600 mb-6">
    Control which advanced features are available. Disabled features will be hidden from the interface to keep the app simple.
  </p>

  <div class="space-y-6">
    <!-- Enhanced Tables Toggle -->
    <div class="border rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h4 class="text-lg font-semibold">Enhanced Tables</h4>
          <p class="text-sm text-gray-600">
            Advanced table features including custom placeholders and modifiers for more complex random generation.
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            class="sr-only peer"
            checked={appConfig.features.enhancedTables}
            onchange={() => handleToggle('enhancedTables')}
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      {#if !appConfig.features.enhancedTables}
        <div class="text-sm text-orange-600 bg-orange-50 p-2 rounded">
          ⚠️ Custom table features will be hidden from the interface
        </div>
      {/if}
    </div>

    <!-- Templates Toggle -->
    <div class="border rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h4 class="text-lg font-semibold">Templates</h4>
          <p class="text-sm text-gray-600">
            Template system for creating reusable content generation patterns with placeholders and random tables.
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            class="sr-only peer"
            checked={appConfig.features.templates}
            onchange={() => handleToggle('templates')}
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      {#if !appConfig.features.templates}
        <div class="text-sm text-orange-600 bg-orange-50 p-2 rounded">
          ⚠️ Template button and template settings will be hidden from the interface
        </div>
      {/if}
    </div>

    <!-- LLM Integration Toggle -->
    <div class="border rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h4 class="text-lg font-semibold">LLM Integration</h4>
          <p class="text-sm text-gray-600">
            Connect to AI language models for enhanced content generation and interactive storytelling assistance.
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            class="sr-only peer"
            checked={appConfig.features.llmIntegration}
            onchange={() => handleToggle('llmIntegration')}
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      {#if !appConfig.features.llmIntegration}
        <div class="text-sm text-orange-600 bg-orange-50 p-2 rounded">
          ⚠️ LLM settings and integration features will be hidden from the interface
        </div>
      {/if}
    </div>

    <!-- Document Mode Toggle -->
    <div class="border rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h4 class="text-lg font-semibold">Document Mode</h4>
          <p class="text-sm text-gray-600">
            Enhanced writing interface with direct text editing, floating controls, and distraction-free writing environment.
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            class="sr-only peer"
            checked={appConfig.features.documentMode}
            onchange={() => handleToggle('documentMode')}
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      {#if !appConfig.features.documentMode}
        <div class="text-sm text-orange-600 bg-orange-50 p-2 rounded">
          ⚠️ Document Mode toggle and advanced writing features will be hidden from the interface
        </div>
      {/if}
    </div>
  </div>

  <!-- Configuration Info -->
  <div class="mt-8 p-4 bg-gray-50 rounded-lg">
    <h4 class="text-sm font-semibold mb-2">Configuration Info</h4>
    <div class="text-xs text-gray-600 space-y-1">
      <div>Version: {appConfig.value.version}</div>
      <div>Last Updated: {new Date(appConfig.value.lastUpdated).toLocaleString()}</div>
    </div>
  </div>
</SettingPage>