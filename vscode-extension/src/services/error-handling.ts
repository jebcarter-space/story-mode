import * as vscode from 'vscode';

export class ErrorHandlingService {
  static showError(message: string, error?: Error | any, context?: string): void {
    const fullMessage = this.formatErrorMessage(message, error, context);
    
    // Log the full error details
    console.error('Story Mode Error:', {
      message,
      error: error?.toString(),
      stack: error?.stack,
      context
    });

    // Show user-friendly error with action buttons
    this.showErrorWithActions(fullMessage, error, context);
  }

  private static formatErrorMessage(message: string, error?: Error | any, context?: string): string {
    let formatted = message;
    
    if (context) {
      formatted = `[${context}] ${formatted}`;
    }

    if (error) {
      // Extract meaningful error information
      if (error.code === 'ENOENT') {
        formatted += ' (File not found)';
      } else if (error.code === 'EACCES') {
        formatted += ' (Permission denied)';
      } else if (error.message && error.message !== message) {
        formatted += `: ${error.message}`;
      }
    }

    return formatted;
  }

  private static showErrorWithActions(message: string, error?: Error | any, context?: string): void {
    const actions: string[] = [];
    
    // Suggest actions based on error type and context
    if (context === 'LLM') {
      actions.push('Setup LLM Profile', 'Check Network');
    } else if (context === 'Repository') {
      actions.push('Create Library', 'Check Permissions');
    } else if (context === 'Template') {
      actions.push('Create Templates', 'Open Template Folder');
    }
    
    // Always offer to open output/logs
    actions.push('View Logs', 'Report Issue');

    vscode.window.showErrorMessage(message, ...actions).then(action => {
      this.handleErrorAction(action, error, context);
    });
  }

  private static async handleErrorAction(action: string | undefined, error?: Error | any, context?: string): Promise<void> {
    if (!action) return;

    switch (action) {
      case 'Setup LLM Profile':
        await this.guideLLMSetup();
        break;
      case 'Create Library':
        await vscode.commands.executeCommand('story-mode.createLibrary');
        break;
      case 'Create Templates':
        await this.guideTemplateSetup();
        break;
      case 'Check Network':
        await this.showNetworkDiagnostics();
        break;
      case 'Check Permissions':
        await this.showPermissionHelp();
        break;
      case 'Open Template Folder':
        await this.openTemplateFolder();
        break;
      case 'View Logs':
        await this.showLogs();
        break;
      case 'Report Issue':
        await this.reportIssue(error, context);
        break;
    }
  }

  private static async guideLLMSetup(): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      'Story Mode needs an LLM profile to generate text. Would you like to create one?',
      'Create Profile', 'Learn More', 'Cancel'
    );

    switch (choice) {
      case 'Create Profile':
        await this.showLLMSetupWizard();
        break;
      case 'Learn More':
        await vscode.env.openExternal(vscode.Uri.parse('https://github.com/jebcarter-space/story-mode#llm-setup'));
        break;
    }
  }

  private static async showLLMSetupWizard(): Promise<void> {
    // Simple wizard for creating an LLM profile
    const provider = await vscode.window.showQuickPick([
      { label: 'OpenAI', value: 'openai' },
      { label: 'KoboldCPP (Local)', value: 'koboldcpp' },
      { label: 'OpenRouter', value: 'openrouter' },
      { label: 'Custom', value: 'custom' }
    ], {
      placeHolder: 'Select your LLM provider'
    });

    if (!provider) return;

    const profileName = await vscode.window.showInputBox({
      prompt: 'Enter a name for this profile',
      placeHolder: 'My LLM Profile'
    });

    if (!profileName) return;

    let endpoint = '';
    let needsApiKey = true;

    switch (provider.value) {
      case 'openai':
        endpoint = 'https://api.openai.com/v1/chat/completions';
        break;
      case 'koboldcpp':
        endpoint = await vscode.window.showInputBox({
          prompt: 'Enter KoboldCPP endpoint',
          placeHolder: 'http://localhost:5001/v1/chat/completions'
        }) || '';
        needsApiKey = false;
        break;
      case 'openrouter':
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        break;
      case 'custom':
        endpoint = await vscode.window.showInputBox({
          prompt: 'Enter API endpoint',
          placeHolder: 'https://your-api.com/v1/chat/completions'
        }) || '';
        break;
    }

    if (!endpoint) return;

    let apiKey = '';
    if (needsApiKey) {
      apiKey = await vscode.window.showInputBox({
        prompt: `Enter API key for ${provider.label}`,
        password: true
      }) || '';

      if (!apiKey) return;
    }

    const model = await vscode.window.showInputBox({
      prompt: 'Enter model name',
      placeHolder: provider.value === 'openai' ? 'gpt-3.5-turbo' : 'your-model-name'
    });

    if (!model) return;

    // Create the profile
    const profile = {
      name: profileName,
      provider: provider.value,
      endpoint,
      apiKey,
      model,
      settings: {
        temperature: 0.7,
        maxTokens: 500,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0
      }
    };

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error('No workspace folder found');
      }

      const profilesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'llm-profiles');
      await vscode.workspace.fs.createDirectory(profilesPath);
      
      const profileFile = vscode.Uri.joinPath(profilesPath, `${profileName.toLowerCase().replace(/\s+/g, '-')}.json`);
      await vscode.workspace.fs.writeFile(profileFile, new TextEncoder().encode(JSON.stringify(profile, null, 2)));

      // Set as default
      await vscode.workspace.getConfiguration('storyMode').update(
        'defaultLLMProfile', 
        profileName.toLowerCase().replace(/\s+/g, '-'), 
        vscode.ConfigurationTarget.Workspace
      );

      vscode.window.showInformationMessage(`LLM profile "${profileName}" created successfully!`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create LLM profile: ${error}`);
    }
  }

  private static async guideTemplateSetup(): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      'No templates found. Would you like to create the template structure?',
      'Create Structure', 'Learn More', 'Cancel'
    );

    if (choice === 'Create Structure') {
      await vscode.commands.executeCommand('story-mode.createLibrary');
    } else if (choice === 'Learn More') {
      await vscode.env.openExternal(vscode.Uri.parse('https://github.com/jebcarter-space/story-mode#templates'));
    }
  }

  private static async showNetworkDiagnostics(): Promise<void> {
    const message = `
Network Troubleshooting:

1. Check your internet connection
2. Verify API endpoint is correct
3. Ensure API key is valid
4. Check firewall/proxy settings
5. Try a different LLM provider

For local models (KoboldCPP):
- Ensure the server is running
- Check the endpoint URL (usually localhost:5001)
- Verify CORS is enabled if needed
    `.trim();

    vscode.window.showInformationMessage(message, { modal: true });
  }

  private static async showPermissionHelp(): Promise<void> {
    const message = `
File Permission Issues:

1. Check if workspace folder is writable
2. Ensure .story-mode folder exists
3. Try restarting VSCode as administrator (if needed)
4. Check file system permissions
5. Verify no files are locked/readonly

The extension needs to create and modify files in:
- .story-mode/repositories/
- .story-mode/templates/
- .story-mode/llm-profiles/
    `.trim();

    vscode.window.showInformationMessage(message, { modal: true });
  }

  private static async openTemplateFolder(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const templatePath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'templates');
    try {
      await vscode.commands.executeCommand('vscode.openFolder', templatePath, { forceNewWindow: false });
    } catch (error) {
      // Fallback: reveal in explorer
      try {
        await vscode.commands.executeCommand('revealFileInOS', templatePath);
      } catch (revealError) {
        vscode.window.showErrorMessage('Could not open template folder. Please navigate to .story-mode/templates/ manually.');
      }
    }
  }

  private static async showLogs(): Promise<void> {
    // Show output channel if it exists, or general guidance
    vscode.window.showInformationMessage(
      'Check the VSCode Developer Console (Help > Toggle Developer Tools) for detailed error logs.',
      'Open Developer Tools'
    ).then(choice => {
      if (choice === 'Open Developer Tools') {
        vscode.commands.executeCommand('workbench.action.toggleDevTools');
      }
    });
  }

  private static async reportIssue(error?: Error | any, context?: string): Promise<void> {
    const errorDetails = error ? `\n\nError Details:\n${error.toString()}\n${error.stack || ''}` : '';
    const issueBody = encodeURIComponent(`
**Context:** ${context || 'Unknown'}

**Error Description:**
[Please describe what you were trying to do when this error occurred]

**Technical Details:**${errorDetails}

**Environment:**
- VSCode Version: ${vscode.version}
- OS: ${process.platform}
- Extension Version: [Extension version]
    `.trim());

    const issueUrl = `https://github.com/jebcarter-space/story-mode/issues/new?body=${issueBody}&title=Extension%20Error:%20${encodeURIComponent(context || 'Error')}`;
    
    await vscode.env.openExternal(vscode.Uri.parse(issueUrl));
  }

  /**
   * Validate extension setup and show helpful messages
   */
  static async validateSetup(): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showWarningMessage(
        'Story Mode works best with a workspace folder. Please open a folder to enable all features.',
        'Open Folder'
      ).then(choice => {
        if (choice === 'Open Folder') {
          vscode.commands.executeCommand('vscode.openFolder');
        }
      });
      return false;
    }

    // Check for .story-mode structure
    const storyModeFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode');
    try {
      await vscode.workspace.fs.stat(storyModeFolder);
    } catch (error) {
      const choice = await vscode.window.showInformationMessage(
        'Story Mode library structure not found. Would you like to create it?',
        'Create Library', 'Not Now'
      );
      
      if (choice === 'Create Library') {
        await vscode.commands.executeCommand('story-mode.createLibrary');
        return true;
      }
      return false;
    }

    // Check for LLM profile
    const defaultProfile = vscode.workspace.getConfiguration('storyMode').get('defaultLLMProfile', '');
    if (!defaultProfile) {
      const choice = await vscode.window.showInformationMessage(
        'No default LLM profile set. AI features will not work without one.',
        'Setup LLM', 'Not Now'
      );
      
      if (choice === 'Setup LLM') {
        await this.guideLLMSetup();
      }
      return false;
    }

    return true;
  }
}