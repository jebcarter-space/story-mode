import * as vscode from 'vscode';
import type { LLMProfile, LLMProfileList } from '../types';
import { SYSTEM_PROMPT_PRESETS } from '../lib/system-prompt-presets';

export class ConfigurationWizard {
  constructor(private context: vscode.ExtensionContext) {}

  async showWizard(): Promise<void> {
    // Step 1: Welcome and setup overview
    const startSetup = await vscode.window.showInformationMessage(
      'Welcome to Story Mode Configuration Wizard! This will help you set up your default AI settings.',
      'Start Setup',
      'Cancel'
    );

    if (startSetup !== 'Start Setup') {
      return;
    }

    try {
      // Step 2: LLM Profile selection
      await this.configureLLMProfile();
      
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

  private async configureLLMProfile(): Promise<void> {
    // Get available LLM profiles
    const profiles = await this.getLLMProfiles();
    const profileNames = Object.keys(profiles);

    if (profileNames.length === 0) {
      const createProfile = await vscode.window.showWarningMessage(
        'No LLM profiles found. You need to create an LLM profile first.',
        'Create Profile',
        'Skip'
      );
      
      if (createProfile === 'Create Profile') {
        vscode.window.showInformationMessage(
          'Please create an LLM profile in your .story-mode/llm-profiles folder and rerun the wizard.'
        );
      }
      return;
    }

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