<script lang="ts">
  import type { LLMProfile, LLMViews } from "../../../data/types";
  import { createLLMProfiles } from "../../../data/models/llm-profiles.svelte.ts";
  import { LLMService } from "../../../lib/llm-service";
  import { loadDefaultLLMProfiles } from "../../../lib/default-llm-profiles";
  import SettingPage from "../../ui/SettingPage.svelte";

  let profiles = createLLMProfiles();
  let profileList = $derived(profiles.value);

  let open: LLMViews = $state('');
  let selectedKey = $state('');
  let importData = $state('');
  let exportData = $state('');
  let testingConnection = $state<string | null>(null);
  let testResults = $state<{ [key: string]: boolean }>({});

  // Default profile template
  let profile: LLMProfile = $state({
    name: '',
    provider: 'openai',
    apiKey: '',
    endpoint: '',
    model: 'gpt-3.5-turbo',
    settings: {
      temperature: 0.7,
      maxTokens: 500,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    },
    includeSystemContent: false,
    maxContextEntries: 10,
    created: 0,
    updated: 0
  });

  function resetProfile() {
    profile = {
      name: '',
      provider: 'openai',
      apiKey: '',
      endpoint: '',
      model: 'gpt-3.5-turbo',
      settings: {
        temperature: 0.7,
        maxTokens: 500,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0
      },
      includeSystemContent: false,
      maxContextEntries: 10,
      created: 0,
      updated: 0
    };
  }

  function saveProfile() {
    if (selectedKey) {
      profiles.update(selectedKey, profile);
    } else {
      profiles.add(profile);
    }
    resetProfile();
    open = '';
    selectedKey = '';
  }

  function editProfile(key: string) {
    profile = { ...profileList[key] };
    selectedKey = key;
    open = 'create';
  }

  function deleteProfile(key: string) {
    if (confirm('Are you sure you want to delete this profile?')) {
      profiles.remove(key);
      if (selectedKey === key) {
        open = '';
        selectedKey = '';
      }
    }
  }

  function duplicateProfile(key: string) {
    const original = profileList[key];
    const newName = `${original.name} Copy`;
    profiles.duplicate(key, newName);
  }

  function openImport() {
    importData = '';
    open = 'import';
  }

  function importProfiles() {
    try {
      const parsed = JSON.parse(importData);
      profiles.importProfiles(parsed);
      importData = '';
      open = '';
    } catch (error) {
      alert('Invalid JSON format. Please check your data and try again.');
      console.error('Import failed:', error);
    }
  }

  function openExport() {
    exportData = JSON.stringify(profiles.exportProfiles(), null, 2);
    open = 'export';
  }

  function loadDefaults() {
    loadDefaultLLMProfiles();
    // Force reactive update by reloading from localStorage
    profiles.reload();
  }

  function getDefaultEndpoint(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      case 'mistral':
        return 'https://api.mistral.ai/v1/chat/completions';
      case 'openrouter':
        return 'https://openrouter.ai/api/v1/chat/completions';
      case 'koboldcpp':
        return 'http://localhost:5001/v1/chat/completions';
      case 'custom':
        return '';
      default:
        return '';
    }
  }

  function updateEndpoint() {
    if (profile.provider !== 'custom') {
      profile.endpoint = getDefaultEndpoint(profile.provider);
    }
  }

  async function testConnection(key: string) {
    const profileToTest = profileList[key];
    if (!profileToTest) return;

    testingConnection = key;
    try {
      const service = new LLMService(profileToTest);
      const result = await service.testConnection();
      testResults[key] = result;
    } catch (error) {
      console.error('Connection test failed:', error);
      testResults[key] = false;
    } finally {
      testingConnection = null;
    }
  }

  $effect(() => {
    updateEndpoint();
  });
</script>

<SettingPage>
  <div class="flex justify-between items-center mb-6">
    <h3 class="text-3xl font-bold">LLM Settings</h3>
    <div class="flex gap-2">
      <button onclick={() => { resetProfile(); open = 'create'; }} class="px-3 py-1 bg-green-500 text-white rounded text-sm">
        Create Profile
      </button>
      <button onclick={openImport} class="px-3 py-1 bg-blue-500 text-white rounded text-sm">
        Import
      </button>
      <button onclick={openExport} class="px-3 py-1 bg-blue-500 text-white rounded text-sm">
        Export
      </button>
      <button onclick={loadDefaults} class="px-3 py-1 bg-green-500 text-white rounded text-sm">
        Load Defaults
      </button>
    </div>
  </div>

  <div class="flex flex-col">
    {#if open === 'create'}
      <div class="mb-6 p-4 border rounded">
        <h4 class="text-xl mb-3">{selectedKey ? 'Edit Profile' : 'Create Profile'}</h4>
        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Profile Name</label>
            <input 
              type="text" 
              placeholder="e.g., Creative Assistant"
              bind:value={profile.name} 
              class="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Provider</label>
            <select bind:value={profile.provider} class="w-full p-2 border rounded">
              <option value="openai">OpenAI</option>
              <option value="mistral">Mistral AI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="koboldcpp">KoboldCPP</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">API Key</label>
            <input 
              type="password" 
              placeholder="Your API key"
              bind:value={profile.apiKey} 
              class="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Endpoint URL</label>
            <input 
              type="url" 
              placeholder="API endpoint URL"
              bind:value={profile.endpoint} 
              readonly={profile.provider !== 'custom'}
              class="w-full p-2 border rounded {profile.provider !== 'custom' ? 'bg-gray-100' : ''}"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Model</label>
            <input 
              type="text" 
              placeholder="e.g., gpt-3.5-turbo"
              bind:value={profile.model} 
              class="w-full p-2 border rounded"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">Temperature ({profile.settings.temperature})</label>
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="0.1"
                bind:value={profile.settings.temperature} 
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Max Tokens</label>
              <input 
                type="number" 
                min="1" 
                max="4000"
                bind:value={profile.settings.maxTokens} 
                class="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">Top P ({profile.settings.topP})</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                bind:value={profile.settings.topP} 
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Freq Penalty ({profile.settings.frequencyPenalty})</label>
              <input 
                type="range" 
                min="-2" 
                max="2" 
                step="0.1"
                bind:value={profile.settings.frequencyPenalty} 
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Pres Penalty ({profile.settings.presencePenalty})</label>
              <input 
                type="range" 
                min="-2" 
                max="2" 
                step="0.1"
                bind:value={profile.settings.presencePenalty} 
                class="w-full"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">Max Context Entries</label>
              <input 
                type="number" 
                min="1" 
                max="50"
                bind:value={profile.maxContextEntries} 
                class="w-full p-2 border rounded"
              />
            </div>
            <div class="flex items-center">
              <label class="flex items-center">
                <input 
                  type="checkbox" 
                  bind:checked={profile.includeSystemContent}
                  class="mr-2"
                />
                Include System Content
              </label>
            </div>
          </div>
        </div>
        
        <div class="flex gap-2 mt-4">
          <button onclick={saveProfile} class="px-4 py-2 bg-green-500 text-white rounded">
            {selectedKey ? 'Update' : 'Create'} Profile
          </button>
          <button onclick={() => { open = ''; selectedKey = ''; resetProfile(); }} class="px-4 py-2 bg-gray-500 text-white rounded">
            Cancel
          </button>
        </div>
      </div>
    {:else if open === 'import'}
      <div class="mb-6 p-4 border rounded">
        <h4 class="text-xl mb-3">Import Profiles</h4>
        <textarea 
          bind:value={importData} 
          placeholder="Paste your JSON profile data here..."
          class="w-full p-2 border rounded h-32"
        ></textarea>
        <div class="flex gap-2 mt-3">
          <button onclick={importProfiles} class="px-4 py-2 bg-blue-500 text-white rounded">
            Import
          </button>
          <button onclick={() => open = ''} class="px-4 py-2 bg-gray-500 text-white rounded">
            Cancel
          </button>
        </div>
      </div>
    {:else if open === 'export'}
      <div class="mb-6 p-4 border rounded">
        <h4 class="text-xl mb-3">Export Profiles</h4>
        <textarea 
          readonly 
          bind:value={exportData} 
          class="w-full p-2 border rounded h-32 bg-gray-50"
        ></textarea>
        <div class="flex gap-2 mt-3">
          <button onclick={() => navigator.clipboard.writeText(exportData)} class="px-4 py-2 bg-blue-500 text-white rounded">
            Copy to Clipboard
          </button>
          <button onclick={() => open = ''} class="px-4 py-2 bg-gray-500 text-white rounded">
            Close
          </button>
        </div>
      </div>
    {/if}

    <!-- Profile List -->
    <div class="space-y-3">
      {#each Object.entries(profileList) as [key, prof]}
        <div class="p-4 border rounded flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h4 class="text-lg font-medium">{prof.name}</h4>
              <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{prof.provider}</span>
              {#if testResults[key] !== undefined}
                <span class="px-2 py-1 rounded text-xs {testResults[key] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  {testResults[key] ? '✓ Connected' : '✗ Failed'}
                </span>
              {/if}
            </div>
            <div class="text-sm text-gray-600 space-y-1">
              <div><strong>Model:</strong> {prof.model}</div>
              <div><strong>Context:</strong> {prof.maxContextEntries} entries, {prof.includeSystemContent ? 'includes' : 'excludes'} system content</div>
              <div><strong>Settings:</strong> temp {prof.settings.temperature}, tokens {prof.settings.maxTokens}</div>
            </div>
          </div>
          <div class="flex gap-2 ml-4">
            <button onclick={() => testConnection(key)} disabled={testingConnection === key} class="px-2 py-1 bg-purple-500 text-white rounded text-xs">
              {testingConnection === key ? 'Testing...' : 'Test'}
            </button>
            <button onclick={() => editProfile(key)} class="px-2 py-1 bg-blue-500 text-white rounded text-xs">
              Edit
            </button>
            <button onclick={() => duplicateProfile(key)} class="px-2 py-1 bg-yellow-500 text-white rounded text-xs">
              Duplicate
            </button>
            <button onclick={() => deleteProfile(key)} class="px-2 py-1 bg-red-500 text-white rounded text-xs">
              Delete
            </button>
          </div>
        </div>
      {:else}
        <div class="p-8 text-center text-gray-500">
          <p class="mb-4">No LLM profiles configured yet.</p>
          <button onclick={() => { resetProfile(); open = 'create'; }} class="px-4 py-2 bg-green-500 text-white rounded">
            Create Your First Profile
          </button>
        </div>
      {/each}
    </div>
  </div>
</SettingPage>