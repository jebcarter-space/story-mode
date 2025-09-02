import * as vscode from 'vscode';
import type { LLMProfile, LLMProfileList } from '../types';
import { SYSTEM_PROMPT_PRESETS } from '../lib/system-prompt-presets';

interface ProviderDefaults {
  endpoint: string;
  needsApiKey: boolean;
  defaultModel: string;
  settings: Partial<LLMProfile['settings']>;
}

const PROVIDER_CONFIGS: Record<string, ProviderDefaults> = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    needsApiKey: true,
    defaultModel: 'gpt-3.5-turbo',
    settings: {
      temperature: 0.7,
      maxTokens: 500,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    }
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    needsApiKey: true,
    defaultModel: 'claude-3-haiku-20240307',
    settings: {
      temperature: 0.7,
      maxTokens: 500,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    }
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    needsApiKey: true,
    defaultModel: 'openai/gpt-3.5-turbo',
    settings: {
      temperature: 0.7,
      maxTokens: 500,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    }
  },
  koboldcpp: {
    endpoint: 'http://localhost:5001/v1/chat/completions',
    needsApiKey: false,
    defaultModel: 'local-model',
    settings: {
      temperature: 0.7,
      maxTokens: 400,
      topP: 0.95,
      frequencyPenalty: 0,
      presencePenalty: 0,
      // KoboldCPP specific defaults
      tfs: 1.0,
      topA: 0,
      topK: 100,
      minP: 0.0,
      typical: 1.0,
      repPen: 1.1,
      repPenRange: 256,
      dynatempRange: 0,
      dynatempExponent: 1,
      smoothingFactor: 0,
      mirostat: 0,
      mirostatTau: 5.0,
      mirostatEta: 0.1,
      dryMultiplier: 0,
      dryBase: 1.75,
      dryAllowedLength: 2,
      drySequenceBreakers: ['\\n', ':', '"', '*'],
      xtcThreshold: 0.1,
      xtcProbability: 0,
      nsigma: 0,
      trimStop: true,
      useDefaultBadWordsIds: false,
      renderSpecial: false,
      bypassEOS: false,
      grammarRetainState: false,
      logprobs: false,
      replaceInstructPlaceholders: false
    }
  },
  custom: {
    endpoint: '',
    needsApiKey: true,
    defaultModel: 'custom-model',
    settings: {
      temperature: 0.7,
      maxTokens: 500,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    }
  }
};

export class ConfigurationWizard {
  constructor(private context: vscode.ExtensionContext) {}

  async showWizard(): Promise<void> {
    // Step 1: Welcome and setup overview
    const startSetup = await vscode.window.showInformationMessage(
      'Welcome to Story Mode Configuration Wizard! This will help you set up your LLM connections and default AI settings.',
      'Start Setup',
      'Cancel'
    );

    if (startSetup !== 'Start Setup') {
      return;
    }

    try {
      // Step 2: Connection setup (create or select existing)
      await this.configureConnection();
      
      // Step 3: System Prompt configuration
      await this.configureSystemPrompt();
      
      // Step 4: Author's Note configuration
      await this.configureAuthorNote();
      
      // Step 5: Completion
      vscode.window.showInformationMessage(
        'Configuration completed! Your settings have been saved and will be used as defaults for all AI interactions.',
        'Open Settings'
      ).then((selection) => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'storyMode');
        }
      });
      
    } catch (error) {
      vscode.window.showErrorMessage(`Configuration wizard failed: ${error}`);
    }
  }

  private async configureConnection(): Promise<void> {
    // Get available LLM profiles
    const profiles = await this.getLLMProfiles();
    const profileNames = Object.keys(profiles);

    const options = [
      { 
        label: '$(add) Create New Connection', 
        description: 'Set up a new LLM provider connection',
        action: 'create'
      }
    ];

    if (profileNames.length > 0) {
      options.push(
        { 
          label: '$(list-selection) Select Existing Connection', 
          description: `Choose from ${profileNames.length} existing profile(s)`,
          action: 'select'
        }
      );
    }

    const choice = await vscode.window.showQuickPick(options, {
      title: 'LLM Connection Setup',
      placeHolder: 'Choose how to configure your LLM connection'
    });

    if (!choice) return;

    if (choice.action === 'create') {
      await this.createNewConnection();
    } else {
      await this.selectExistingConnection(profiles, profileNames);
    }
  }

  private async createNewConnection(): Promise<void> {
    // Step 1: Provider selection
    const provider = await vscode.window.showQuickPick([
      { label: 'OpenAI', description: 'ChatGPT API - requires API key', value: 'openai' },
      { label: 'Anthropic', description: 'Claude API - requires API key', value: 'anthropic' },
      { label: 'OpenRouter', description: 'Multiple models via OpenRouter - requires API key', value: 'openrouter' },
      { label: 'KoboldCPP', description: 'Local or tunneled KoboldCPP server', value: 'koboldcpp' },
      { label: 'Custom', description: 'Custom OpenAI-compatible endpoint', value: 'custom' }
    ], {
      title: 'Select LLM Provider',
      placeHolder: 'Choose your AI provider'
    });

    if (!provider) return;

    // Step 2: Profile name
    const profileName = await vscode.window.showInputBox({
      title: 'Connection Name',
      prompt: 'Enter a name for this LLM connection',
      placeHolder: 'My AI Connection',
      validateInput: (value) => {
        if (!value.trim()) return 'Connection name is required';
        if (value.length > 50) return 'Connection name must be 50 characters or less';
        return null;
      }
    });

    if (!profileName) return;

    const config = PROVIDER_CONFIGS[provider.value];

    // Step 3: Endpoint configuration
    let endpoint = config.endpoint;
    if (provider.value === 'koboldcpp') {
      const endpointChoice = await vscode.window.showQuickPick([
        { label: 'Local (localhost:5001)', value: 'http://localhost:5001/v1/chat/completions' },
        { label: 'Local (localhost:5000)', value: 'http://localhost:5000/v1/chat/completions' },
        { label: 'Tunneled URL', value: 'custom' },
        { label: 'Custom URL', value: 'custom' }
      ], {
        title: 'KoboldCPP Endpoint',
        placeHolder: 'Select or specify your KoboldCPP endpoint'
      });

      if (!endpointChoice) return;

      if (endpointChoice.value === 'custom') {
        const customEndpoint = await vscode.window.showInputBox({
          title: 'Custom KoboldCPP Endpoint',
          prompt: 'Enter your KoboldCPP endpoint URL',
          placeHolder: 'http://your-tunnel-url.com/v1/chat/completions',
          validateInput: (value) => {
            if (!value.trim()) return 'Endpoint URL is required';
            try {
              new URL(value);
              return null;
            } catch {
              return 'Please enter a valid URL';
            }
          }
        });
        if (!customEndpoint) return;
        endpoint = customEndpoint;
      } else {
        endpoint = endpointChoice.value;
      }
    } else if (provider.value === 'custom') {
      const customEndpoint = await vscode.window.showInputBox({
        title: 'Custom Endpoint URL',
        prompt: 'Enter your custom API endpoint',
        placeHolder: 'https://your-api.com/v1/chat/completions',
        validateInput: (value) => {
          if (!value.trim()) return 'Endpoint URL is required';
          try {
            new URL(value);
            return null;
          } catch {
            return 'Please enter a valid URL';
          }
        }
      });
      if (!customEndpoint) return;
      endpoint = customEndpoint;
    }

    // Step 4: API Key (if needed)
    let apiKey = '';
    if (config.needsApiKey) {
      apiKey = await vscode.window.showInputBox({
        title: `${provider.label} API Key`,
        prompt: `Enter your API key for ${provider.label}`,
        password: true,
        placeHolder: 'sk-...',
        validateInput: (value) => {
          if (!value.trim()) return 'API key is required';
          return null;
        }
      }) || '';

      if (!apiKey) return;
    }

    // Step 5: Model configuration
    const model = await vscode.window.showInputBox({
      title: 'Model Name',
      prompt: `Enter the model name for ${provider.label}`,
      value: config.defaultModel,
      placeHolder: config.defaultModel,
      validateInput: (value) => {
        if (!value.trim()) return 'Model name is required';
        return null;
      }
    });

    if (!model) return;

    // Step 6: Advanced Settings Configuration
    const configureAdvanced = await vscode.window.showQuickPick([
      { label: 'Use Default Settings', description: 'Apply standard settings for this provider', value: false },
      { label: 'Configure Advanced Settings', description: 'Customize temperature, sampling, and other parameters', value: true }
    ], {
      title: 'LLM Settings Configuration',
      placeHolder: 'Choose how to configure the LLM parameters'
    });

    if (configureAdvanced === undefined) return;

    let settings = { ...config.settings };

    if (configureAdvanced.value) {
      settings = await this.configureAdvancedSettings(provider.value, settings);
      if (!settings) return; // User cancelled
    }

    // Create the profile
    const profile: LLMProfile = {
      name: profileName,
      provider: provider.value as any,
      endpoint,
      apiKey,
      model,
      settings: settings as LLMProfile['settings'],
      includeSystemContent: true,
      maxContextEntries: 10,
      created: Date.now(),
      updated: Date.now()
    };

    // Save the profile
    await this.saveProfile(profileName, profile);

    // Set as default
    await vscode.workspace.getConfiguration('storyMode').update(
      'defaultLLMProfile', 
      profileName, 
      vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage(
      `Connection "${profileName}" created successfully and set as default!`
    );
  }

  private async configureAdvancedSettings(
    provider: string, 
    defaultSettings: Partial<LLMProfile['settings']>
  ): Promise<LLMProfile['settings'] | null> {
    const settings = { ...defaultSettings } as LLMProfile['settings'];

    // Core settings that apply to all providers
    const coreSettings = [
      {
        key: 'temperature',
        label: 'Temperature',
        description: 'Creativity/randomness (0.0 = deterministic, 2.0 = very creative)',
        min: 0,
        max: 2,
        step: 0.1,
        value: settings.temperature
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        description: 'Maximum number of tokens to generate',
        min: 1,
        max: 4000,
        step: 1,
        value: settings.maxTokens
      },
      {
        key: 'topP',
        label: 'Top-P',
        description: 'Nucleus sampling - cumulative probability cutoff',
        min: 0,
        max: 1,
        step: 0.01,
        value: settings.topP
      }
    ];

    // Configure core settings
    for (const setting of coreSettings) {
      const result = await vscode.window.showInputBox({
        title: `Configure ${setting.label}`,
        prompt: setting.description,
        value: setting.value.toString(),
        placeHolder: `${setting.min} - ${setting.max}`,
        validateInput: (value) => {
          const num = parseFloat(value);
          if (isNaN(num)) return 'Please enter a valid number';
          if (num < setting.min || num > setting.max) {
            return `Value must be between ${setting.min} and ${setting.max}`;
          }
          return null;
        }
      });

      if (result === undefined) return null; // User cancelled
      (settings as any)[setting.key] = parseFloat(result);
    }

    // KoboldCPP specific settings
    if (provider === 'koboldcpp') {
      const configureKobold = await vscode.window.showQuickPick([
        { label: 'Skip KoboldCPP Settings', description: 'Use default KoboldCPP parameters', value: false },
        { label: 'Configure KoboldCPP Settings', description: 'Customize sampling, repetition, and advanced parameters', value: true }
      ], {
        title: 'KoboldCPP Advanced Settings',
        placeHolder: 'Configure additional KoboldCPP-specific parameters?'
      });

      if (configureKobold?.value) {
        const koboldSettings = await this.configureKoboldCPPSettings(settings);
        if (koboldSettings) {
          Object.assign(settings, koboldSettings);
        }
      }
    }

    return settings;
  }

  private async configureKoboldCPPSettings(baseSettings: LLMProfile['settings']): Promise<Partial<LLMProfile['settings']> | null> {
    const updates: Partial<LLMProfile['settings']> = {};

    const categories = [
      {
        name: 'Sampling Parameters',
        settings: [
          { key: 'topK', label: 'Top-K', desc: 'Limit to top K tokens (0 = disabled)', min: 0, max: 200, default: 100 },
          { key: 'topA', label: 'Top-A', desc: 'Top-A sampling threshold (0 = disabled)', min: 0, max: 1, step: 0.01, default: 0 },
          { key: 'minP', label: 'Min-P', desc: 'Minimum probability threshold', min: 0, max: 1, step: 0.01, default: 0.0 },
          { key: 'tfs', label: 'TFS', desc: 'Tail-free sampling (1.0 = disabled)', min: 0, max: 1, step: 0.01, default: 1.0 },
          { key: 'typical', label: 'Typical', desc: 'Typical sampling (1.0 = disabled)', min: 0, max: 1, step: 0.01, default: 1.0 },
          { key: 'nsigma', label: 'N-Sigma', desc: 'N-Sigma sampling (0 = disabled)', min: 0, max: 10, step: 0.1, default: 0 }
        ]
      },
      {
        name: 'Repetition Control',
        settings: [
          { key: 'repPen', label: 'Rep Penalty', desc: 'Repetition penalty multiplier', min: 1, max: 2, step: 0.01, default: 1.1 },
          { key: 'repPenRange', label: 'Rep Pen Range', desc: 'Tokens to consider for repetition penalty', min: 0, max: 2048, default: 256 }
        ]
      },
      {
        name: 'Dynamic Temperature',
        settings: [
          { key: 'dynatempRange', label: 'Dynatemp Range', desc: 'Dynamic temperature range (0 = disabled)', min: 0, max: 5, step: 0.1, default: 0 },
          { key: 'dynatempExponent', label: 'Dynatemp Exponent', desc: 'Dynamic temperature exponent', min: 0.1, max: 5, step: 0.1, default: 1 },
          { key: 'smoothingFactor', label: 'Smoothing Factor', desc: 'Temperature smoothing (0 = disabled)', min: 0, max: 10, step: 0.1, default: 0 }
        ]
      }
    ];

    for (const category of categories) {
      const configureCategory = await vscode.window.showQuickPick([
        { label: `Skip ${category.name}`, value: false },
        { label: `Configure ${category.name}`, value: true }
      ], {
        title: `Configure ${category.name}`,
        placeHolder: `Configure ${category.name.toLowerCase()}?`
      });

      if (configureCategory?.value) {
        for (const setting of category.settings) {
          const currentValue = (baseSettings as any)[setting.key] ?? setting.default;
          const result = await vscode.window.showInputBox({
            title: setting.label,
            prompt: setting.desc,
            value: currentValue.toString(),
            validateInput: (value) => {
              const num = parseFloat(value);
              if (isNaN(num)) return 'Please enter a valid number';
              if (num < setting.min || num > setting.max) {
                return `Value must be between ${setting.min} and ${setting.max}`;
              }
              return null;
            }
          });

          if (result === undefined) return null; // User cancelled
          (updates as any)[setting.key] = parseFloat(result);
        }
      }
    }

    return updates;
  }

  private async selectExistingConnection(profiles: LLMProfileList, profileNames: string[]): Promise<void> {
    const currentDefault = vscode.workspace.getConfiguration('storyMode').get<string>('defaultLLMProfile', '');
    
    const selectedProfile = await vscode.window.showQuickPick(
      profileNames.map(name => ({
        label: name,
        description: profiles[name].provider,
        detail: name === currentDefault ? '(currently default)' : undefined,
        picked: name === currentDefault
      })),
      {
        title: 'Choose Default LLM Profile',
        placeHolder: 'Select which LLM profile to use by default for AI continuations'
      }
    );

    if (selectedProfile) {
      await vscode.workspace.getConfiguration('storyMode').update(
        'defaultLLMProfile', 
        selectedProfile.label, 
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(`Default LLM profile set to: ${selectedProfile.label}`);
    }
  }

  private async saveProfile(profileName: string, profile: LLMProfile): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error('No workspace folder found');
    }

    const profilesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'llm-profiles');
    
    // Ensure directory exists
    try {
      await vscode.workspace.fs.createDirectory(profilesPath);
    } catch {
      // Directory might already exist, ignore error
    }

    const profileFile = vscode.Uri.joinPath(profilesPath, `${profileName}.json`);
    const profileContent = JSON.stringify(profile, null, 2);
    
    await vscode.workspace.fs.writeFile(profileFile, Buffer.from(profileContent, 'utf8'));
  }

  private async configureSystemPrompt(): Promise<void> {
    const currentSystemPrompt = vscode.workspace.getConfiguration('storyMode').get<string>('defaultSystemPrompt', '');
    
    // Offer preset options plus custom
    const options = [
      { label: '$(edit) Custom System Prompt', description: 'Write your own system prompt' },
      ...SYSTEM_PROMPT_PRESETS.map(preset => ({
        label: `$(book) ${preset.name}`,
        description: preset.description,
        detail: preset.systemPrompt.substring(0, 100) + '...'
      })),
      { label: '$(x) No Default', description: 'Use LLM profile system prompts only' }
    ];

    if (currentSystemPrompt) {
      options.unshift({
        label: '$(check) Keep Current',
        description: 'Keep existing default system prompt',
        detail: currentSystemPrompt.substring(0, 100) + '...'
      });
    }

    const selection = await vscode.window.showQuickPick(options, {
      title: 'Configure Default System Prompt',
      placeHolder: 'Choose how to set your default system prompt'
    });

    if (!selection) return;

    if (selection.label.includes('Custom')) {
      const customPrompt = await vscode.window.showInputBox({
        title: 'Custom System Prompt',
        prompt: 'Enter your default system prompt',
        value: currentSystemPrompt,
        placeHolder: 'You are a creative storytelling assistant...'
      });

      if (customPrompt !== undefined) {
        await vscode.workspace.getConfiguration('storyMode').update(
          'defaultSystemPrompt', 
          customPrompt, 
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage('Custom system prompt saved');
      }
    } else if (selection.label.includes('Keep Current')) {
      // Do nothing, keep current
    } else if (selection.label.includes('No Default')) {
      await vscode.workspace.getConfiguration('storyMode').update(
        'defaultSystemPrompt', 
        '', 
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage('Default system prompt cleared');
    } else {
      // Find the preset
      const preset = SYSTEM_PROMPT_PRESETS.find(p => selection.label.includes(p.name));
      if (preset) {
        await vscode.workspace.getConfiguration('storyMode').update(
          'defaultSystemPrompt', 
          preset.systemPrompt, 
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage(`System prompt set to: ${preset.name}`);
      }
    }
  }

  private async configureAuthorNote(): Promise<void> {
    const currentAuthorNote = vscode.workspace.getConfiguration('storyMode').get<string>('defaultAuthorNote', '');
    
    // Offer preset options plus custom
    const options = [
      { label: '$(edit) Custom Author\'s Note', description: 'Write your own author\'s note' },
      ...SYSTEM_PROMPT_PRESETS.map(preset => ({
        label: `$(book) ${preset.name}`,
        description: `Use ${preset.name} author's note`,
        detail: preset.authorNote.substring(0, 100) + '...'
      })),
      { label: '$(x) No Default', description: 'Use LLM profile author\'s notes only' }
    ];

    if (currentAuthorNote) {
      options.unshift({
        label: '$(check) Keep Current',
        description: 'Keep existing default author\'s note',
        detail: currentAuthorNote.substring(0, 100) + '...'
      });
    }

    const selection = await vscode.window.showQuickPick(options, {
      title: 'Configure Default Author\'s Note',
      placeHolder: 'Choose how to set your default author\'s note'
    });

    if (!selection) return;

    if (selection.label.includes('Custom')) {
      const customNote = await vscode.window.showInputBox({
        title: 'Custom Author\'s Note',
        prompt: 'Enter your default author\'s note',
        value: currentAuthorNote,
        placeHolder: 'Continue the story naturally...'
      });

      if (customNote !== undefined) {
        await vscode.workspace.getConfiguration('storyMode').update(
          'defaultAuthorNote', 
          customNote, 
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage('Custom author\'s note saved');
      }
    } else if (selection.label.includes('Keep Current')) {
      // Do nothing, keep current
    } else if (selection.label.includes('No Default')) {
      await vscode.workspace.getConfiguration('storyMode').update(
        'defaultAuthorNote', 
        '', 
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage('Default author\'s note cleared');
    } else {
      // Find the preset
      const preset = SYSTEM_PROMPT_PRESETS.find(p => selection.label.includes(p.name));
      if (preset) {
        await vscode.workspace.getConfiguration('storyMode').update(
          'defaultAuthorNote', 
          preset.authorNote, 
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage(`Author's note set to: ${preset.name}`);
      }
    }
  }

  private async getLLMProfiles(): Promise<LLMProfileList> {
    const profiles: LLMProfileList = {};
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return profiles;

    const profilesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'llm-profiles');
    
    try {
      const files = await vscode.workspace.fs.readDirectory(profilesPath);
      
      for (const [fileName, fileType] of files) {
        if (fileType === vscode.FileType.File && fileName.endsWith('.json')) {
          try {
            const content = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(profilesPath, fileName));
            const profile = JSON.parse(content.toString()) as LLMProfile;
            const key = fileName.replace('.json', '');
            profiles[key] = profile;
          } catch (error) {
            console.warn(`Failed to load LLM profile ${fileName}:`, error);
          }
        }
      }
    } catch (error) {
      // Profiles folder doesn't exist
    }

    return profiles;
  }
}