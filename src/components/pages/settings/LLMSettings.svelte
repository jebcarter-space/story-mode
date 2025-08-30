<script lang="ts">
  import type { LLMProfile, LLMViews } from "../../../data/types";
  import { createLLMProfiles } from "../../../data/models/llm-profiles.svelte.ts";
  import { LLMService } from "../../../lib/llm-service";
  import { loadDefaultLLMProfiles } from "../../../lib/default-llm-profiles";
  import { SYSTEM_PROMPT_PRESETS, DEFAULT_SYSTEM_PROMPT, DEFAULT_AUTHOR_NOTE, type SystemPromptPreset } from "../../../lib/system-prompt-presets";
  import SettingPage from "../../ui/SettingPage.svelte";

  let profiles = createLLMProfiles();
  let profileList = $derived(profiles.value);

  let open: LLMViews = $state('');
  let selectedKey = $state('');
  let importData = $state('');
  let exportData = $state('');
  let testingConnection = $state<string | null>(null);
  let testResults = $state<{ [key: string]: boolean }>({});
  
  // UI state for collapsible sections
  let showAdvanced = $state(false);
  let showExpert = $state(false);

  // Default profile template
  let profile: LLMProfile = $state({
    name: '',
    provider: 'openai',
    apiKey: '',
    endpoint: '',
    model: 'gpt-3.5-turbo',
    systemPrompt: '',
    authorNote: '',
    settings: {
      temperature: 0.7,
      maxTokens: 500,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      // KoboldCPP parameters will be initialized when needed
      tfs: undefined,
      topA: undefined,
      topK: undefined,
      minP: undefined,
      typical: undefined,
      repPen: undefined,
      repPenRange: undefined,
      samplerOrder: undefined,
      dynatempRange: undefined,
      dynatempExponent: undefined,
      smoothingFactor: undefined,
      mirostat: undefined,
      mirostatTau: undefined,
      mirostatEta: undefined,
      dryMultiplier: undefined,
      dryBase: undefined,
      dryAllowedLength: undefined,
      drySequenceBreakers: undefined,
      xtcThreshold: undefined,
      xtcProbability: undefined,
      grammar: undefined,
      bannedTokens: undefined,
      logitBias: undefined,
      memory: undefined,
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
      systemPrompt: '',
      authorNote: '',
      settings: {
        temperature: 0.7,
        maxTokens: 500,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        // KoboldCPP parameters will be initialized when needed
        tfs: undefined,
        topA: undefined,
        topK: undefined,
        minP: undefined,
        typical: undefined,
        repPen: undefined,
        repPenRange: undefined,
        samplerOrder: undefined,
        dynatempRange: undefined,
        dynatempExponent: undefined,
        smoothingFactor: undefined,
        mirostat: undefined,
        mirostatTau: undefined,
        mirostatEta: undefined,
        dryMultiplier: undefined,
        dryBase: undefined,
        dryAllowedLength: undefined,
        drySequenceBreakers: undefined,
        xtcThreshold: undefined,
        xtcProbability: undefined,
        grammar: undefined,
        bannedTokens: undefined,
        logitBias: undefined,
        memory: undefined,
      },
      includeSystemContent: false,
      maxContextEntries: 10,
      created: 0,
      updated: 0
    };
  }

  function applyPreset(preset: SystemPromptPreset) {
    profile.systemPrompt = preset.systemPrompt;
    profile.authorNote = preset.authorNote;
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
            <label class="block text-sm font-medium mb-1">
              Endpoint URL
              {#if profile.provider === 'koboldcpp'}
                <span class="text-xs text-gray-500">(editable for tunnel/remote access)</span>
              {/if}
            </label>
            <input 
              type="url" 
              placeholder={profile.provider === 'koboldcpp' ? 'e.g., http://localhost:5001/v1/chat/completions or tunnel URL' : 'API endpoint URL'}
              bind:value={profile.endpoint} 
              readonly={profile.provider !== 'custom' && profile.provider !== 'koboldcpp'}
              class="w-full p-2 border rounded {profile.provider !== 'custom' && profile.provider !== 'koboldcpp' ? 'bg-gray-100' : ''}"
            />
            {#if profile.provider === 'koboldcpp'}
              <div class="text-xs text-gray-600 mt-1">
                For tunnel access, use your tunnel URL (e.g., https://abc123.ngrok.io/v1/chat/completions)
              </div>
            {/if}
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

          <!-- System Prompt & Author Note Configuration -->
          <div class="mt-4 border-t pt-4">
            <h4 class="text-lg font-medium mb-3">Prompt Configuration</h4>
            
            <!-- Preset Selection -->
            <div class="mb-4">
              <label class="block text-sm font-medium mb-2">Quick Presets</label>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                {#each SYSTEM_PROMPT_PRESETS as preset}
                  <button 
                    type="button"
                    onclick={() => applyPreset(preset)} 
                    class="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm transition-colors"
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                {/each}
              </div>
            </div>

            <!-- System Prompt -->
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1" title="Custom system prompt sent at the beginning of every conversation. Supports template variables.">
                System Prompt
              </label>
              <textarea 
                bind:value={profile.systemPrompt} 
                placeholder="Leave empty to use default storytelling prompt..."
                class="w-full p-2 border rounded text-sm resize-vertical"
                rows="4"
              ></textarea>
              <div class="text-xs text-gray-600 mt-1">
                Supports template variables. Leave empty to use the default system prompt.
              </div>
            </div>

            <!-- Author Note -->
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1" title="Additional instructions sent after the story context but before generation. Supports template variables.">
                Author Note
              </label>
              <textarea 
                bind:value={profile.authorNote} 
                placeholder="Optional additional instructions for the AI..."
                class="w-full p-2 border rounded text-sm resize-vertical"
                rows="2"
              ></textarea>
              <div class="text-xs text-gray-600 mt-1">
                Sent after story content but before AI generation. Supports template variables.
              </div>
            </div>
          </div>

          <!-- Basic Settings -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1" title="Controls randomness in text generation. Higher values (1.0-2.0) make output more creative but less coherent.">
                Temperature ({profile.settings.temperature})
              </label>
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
              <label class="block text-sm font-medium mb-1" title="Maximum number of tokens (words/parts) to generate in the response.">
                Max Tokens
              </label>
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
              <label class="block text-sm font-medium mb-1" title="Nucleus sampling. Only considers tokens with cumulative probability up to this value. Lower values (0.1-0.9) make output more focused.">
                Top P ({profile.settings.topP})
              </label>
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
              <label class="block text-sm font-medium mb-1" title="Reduces likelihood of repeating the same words. Positive values discourage repetition.">
                Freq Penalty ({profile.settings.frequencyPenalty})
              </label>
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
              <label class="block text-sm font-medium mb-1" title="Encourages model to talk about new topics. Positive values promote diverse content.">
                Pres Penalty ({profile.settings.presencePenalty})
              </label>
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

          <!-- KoboldCPP Advanced Settings -->
          {#if profile.provider === 'koboldcpp'}
            <div class="mt-4 border-t pt-4">
              <button 
                type="button"
                onclick={() => showAdvanced = !showAdvanced}
                class="flex items-center justify-between w-full p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                <span class="font-medium">Advanced Sampling & Repetition Control</span>
                <span class="transform transition-transform {showAdvanced ? 'rotate-180' : ''}">▼</span>
              </button>
              
              {#if showAdvanced}
                <div class="mt-3 space-y-3 p-3 bg-gray-50 rounded">
                  <!-- Advanced Sampling -->
                  <div>
                    <h4 class="text-sm font-semibold mb-2 text-gray-700">Advanced Sampling</h4>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Tail Free Sampling: Removes tokens from the low probability tail. Lower values make output more focused.">
                          TFS ({profile.settings.tfs ?? 1.0})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          bind:value={profile.settings.tfs} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Top-A sampling: Removes tokens below a certain probability threshold. 0 = disabled.">
                          Top A ({profile.settings.topA ?? 0})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          bind:value={profile.settings.topA} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Top-K sampling: Only considers the K most likely tokens. 0 = disabled.">
                          Top K ({profile.settings.topK ?? 0})
                        </label>
                        <input 
                          type="number" 
                          min="0" 
                          max="200" 
                          bind:value={profile.settings.topK} 
                          class="w-full p-1 border rounded text-xs"
                        />
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Minimum probability threshold. Tokens below this are removed.">
                          Min P ({profile.settings.minP ?? 0})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          bind:value={profile.settings.minP} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Typical sampling: Prefers tokens close to average information density.">
                          Typical ({profile.settings.typical ?? 1.0})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          bind:value={profile.settings.typical} 
                          class="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Repetition Control -->
                  <div>
                    <h4 class="text-sm font-semibold mb-2 text-gray-700">Repetition Control</h4>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Base repetition penalty. Values > 1.0 discourage repetition.">
                          Rep Penalty ({profile.settings.repPen ?? 1.0})
                        </label>
                        <input 
                          type="range" 
                          min="1" 
                          max="2" 
                          step="0.01"
                          bind:value={profile.settings.repPen} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Number of recent tokens to apply repetition penalty to.">
                          Rep Range ({profile.settings.repPenRange ?? 256})
                        </label>
                        <input 
                          type="number" 
                          min="0" 
                          max="2048" 
                          bind:value={profile.settings.repPenRange} 
                          class="w-full p-1 border rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Dynamic Temperature -->
                  <div>
                    <h4 class="text-sm font-semibold mb-2 text-gray-700">Dynamic Temperature</h4>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Temperature varies between (temp-range) and (temp+range). 0 = static temperature.">
                          Range ({profile.settings.dynatempRange ?? 0})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="0.1"
                          bind:value={profile.settings.dynatempRange} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Exponent for dynamic temperature calculation.">
                          Exponent ({profile.settings.dynatempExponent ?? 1.0})
                        </label>
                        <input 
                          type="range" 
                          min="0.1" 
                          max="5" 
                          step="0.1"
                          bind:value={profile.settings.dynatempExponent} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Temperature smoothing factor. Higher values smooth temperature changes.">
                          Smoothing ({profile.settings.smoothingFactor ?? 0})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="0.1"
                          bind:value={profile.settings.smoothingFactor} 
                          class="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            <!-- Expert Settings -->
            <div class="mt-4 border-t pt-4">
              <button 
                type="button"
                onclick={() => showExpert = !showExpert}
                class="flex items-center justify-between w-full p-2 bg-red-50 hover:bg-red-100 rounded transition-colors border border-red-200"
              >
                <span class="font-medium text-red-800">Expert Settings (Advanced Users Only)</span>
                <span class="transform transition-transform {showExpert ? 'rotate-180' : ''} text-red-600">▼</span>
              </button>
              
              {#if showExpert}
                <div class="mt-3 space-y-3 p-3 bg-red-50 rounded border border-red-200">
                  <!-- Mirostat -->
                  <div>
                    <h4 class="text-sm font-semibold mb-2 text-gray-700">Mirostat</h4>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Mirostat mode: 0=disabled, 1=v1, 2=v2. Controls perplexity during generation.">
                          Mode ({profile.settings.mirostat ?? 0})
                        </label>
                        <select bind:value={profile.settings.mirostat} class="w-full p-1 border rounded text-xs">
                          <option value={0}>Disabled</option>
                          <option value={1}>Mirostat v1</option>
                          <option value={2}>Mirostat v2</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Target cross-entropy (perplexity). Higher values allow more variation.">
                          Tau ({profile.settings.mirostatTau ?? 5.0})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          step="0.1"
                          bind:value={profile.settings.mirostatTau} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Learning rate for mirostat adjustments.">
                          Eta ({profile.settings.mirostatEta ?? 0.1})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01"
                          bind:value={profile.settings.mirostatEta} 
                          class="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- DRY (Don't Repeat Yourself) -->
                  <div>
                    <h4 class="text-sm font-semibold mb-2 text-gray-700">DRY (Don't Repeat Yourself)</h4>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs font-medium mb-1" title="DRY multiplier. 0 = disabled. Higher values penalize repetition more.">
                          Multiplier ({profile.settings.dryMultiplier ?? 0})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="5" 
                          step="0.1"
                          bind:value={profile.settings.dryMultiplier} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Base DRY value.">
                          Base ({profile.settings.dryBase ?? 1.75})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="5" 
                          step="0.1"
                          bind:value={profile.settings.dryBase} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Minimum sequence length before DRY applies.">
                          Allowed Length ({profile.settings.dryAllowedLength ?? 2})
                        </label>
                        <input 
                          type="number" 
                          min="0" 
                          max="20" 
                          bind:value={profile.settings.dryAllowedLength} 
                          class="w-full p-1 border rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- XTC -->
                  <div>
                    <h4 class="text-sm font-semibold mb-2 text-gray-700">XTC (Exclude Top Choices)</h4>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-medium mb-1" title="XTC threshold value.">
                          Threshold ({profile.settings.xtcThreshold ?? 0.1})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01"
                          bind:value={profile.settings.xtcThreshold} 
                          class="w-full"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="XTC probability. Set above 0 to enable XTC sampling.">
                          Probability ({profile.settings.xtcProbability ?? 0})
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01"
                          bind:value={profile.settings.xtcProbability} 
                          class="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Grammar & Constraints -->
                  <div>
                    <h4 class="text-sm font-semibold mb-2 text-gray-700">Grammar & Constraints</h4>
                    <div class="grid grid-cols-1 gap-3">
                      <div>
                        <label class="block text-xs font-medium mb-1" title="GBNF grammar string to constrain output format.">
                          Grammar (GBNF)
                        </label>
                        <textarea 
                          bind:value={profile.settings.grammar} 
                          placeholder="Enter GBNF grammar rules..."
                          class="w-full p-2 border rounded text-xs resize-vertical"
                          rows="3"
                        ></textarea>
                      </div>
                      <div>
                        <label class="block text-xs font-medium mb-1" title="Forced memory insertion at the beginning of prompts.">
                          Memory
                        </label>
                        <textarea 
                          bind:value={profile.settings.memory} 
                          placeholder="Forced memory content..."
                          class="w-full p-2 border rounded text-xs resize-vertical"
                          rows="2"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}

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