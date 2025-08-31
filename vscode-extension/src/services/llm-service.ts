import * as vscode from 'vscode';
import fetch from 'node-fetch';
import type { LLMProfile, RepositoryItem, Template, InlineContinuationOptions } from '../types';

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant helping with creative writing and interactive storytelling. Continue the story naturally, maintaining consistency with the established tone, characters, and setting. Keep responses engaging and appropriate for the context.`;

export interface LLMResponse {
  choices: Array<{
    delta?: {
      content?: string;
    };
    message?: {
      content: string;
    };
    finish_reason?: string;
  }>;
}

export interface LLMGenerationOptions {
  repositoryItems?: RepositoryItem[];
  maxContextLength: number;
  includeRepositoryContext: boolean;
  llmProfile?: string;
}

export class LLMService {
  constructor(private context: vscode.ExtensionContext) {}

  async generateContinuation(
    textBeforeCursor: string, 
    options: LLMGenerationOptions,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string> {
    // Get LLM profile from settings or use default
    const profileKey = options.llmProfile || vscode.workspace.getConfiguration('storyMode').get('defaultLLMProfile', '');
    const profile = await this.getLLMProfile(profileKey);
    
    if (!profile) {
      throw new Error('No LLM profile configured. Please set up an LLM profile in settings.');
    }

    // Build context with repository items
    let context = this.truncateContext(textBeforeCursor, options.maxContextLength);
    
    if (options.includeRepositoryContext && options.repositoryItems && options.repositoryItems.length > 0) {
      const repositoryContext = this.buildRepositoryContext(options.repositoryItems);
      context = repositoryContext + '\n\n' + context;
    }

    // Make LLM request
    return await this.callLLM(profile, context, cancellationToken);
  }

  async expandTemplate(template: Template, currentText: string): Promise<string> {
    const profileKey = template.llmProfile || vscode.workspace.getConfiguration('storyMode').get('defaultLLMProfile', '');
    const profile = await this.getLLMProfile(profileKey);
    
    if (!profile || !template.llmInstructions) {
      return template.content;
    }

    const prompt = `${template.llmInstructions}\n\nTemplate: ${template.content}\nCurrent Context: ${currentText.slice(-500)}`;
    return await this.callLLM(profile, prompt);
  }

  private async getLLMProfile(profileKey: string): Promise<LLMProfile | null> {
    if (!profileKey) return null;
    
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return null;

      const profilePath = vscode.Uri.joinPath(
        workspaceFolders[0].uri, 
        '.story-mode', 
        'llm-profiles', 
        `${profileKey}.json`
      );

      const profileData = await vscode.workspace.fs.readFile(profilePath);
      return JSON.parse(profileData.toString());
    } catch (error) {
      console.error(`Failed to load LLM profile ${profileKey}:`, error);
      return null;
    }
  }

  private truncateContext(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    // Try to truncate at a sentence boundary
    const truncated = text.slice(-maxLength);
    const sentenceStart = truncated.indexOf('. ');
    
    if (sentenceStart > 0 && sentenceStart < truncated.length * 0.3) {
      return truncated.slice(sentenceStart + 2);
    }
    
    return truncated;
  }

  private buildRepositoryContext(items: RepositoryItem[]): string {
    if (items.length === 0) return '';
    
    const context = items.map(item => 
      `${item.category}: ${item.name}\n${item.content}`
    ).join('\n\n');
    
    return `=== REPOSITORY CONTEXT ===\n${context}\n=== END REPOSITORY CONTEXT ===`;
  }

  private async callLLM(
    profile: LLMProfile, 
    prompt: string, 
    cancellationToken?: vscode.CancellationToken
  ): Promise<string> {
    const systemPrompt = profile.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: prompt }
    ];

    const requestBody = {
      messages,
      model: profile.model,
      temperature: profile.settings.temperature,
      max_tokens: profile.settings.maxTokens,
      top_p: profile.settings.topP,
      frequency_penalty: profile.settings.frequencyPenalty,
      presence_penalty: profile.settings.presencePenalty,
      stream: false
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization based on provider
    if (profile.provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${profile.apiKey}`;
      headers['HTTP-Referer'] = 'https://vscode-story-mode';
    } else if (profile.provider !== 'koboldcpp') {
      headers['Authorization'] = `Bearer ${profile.apiKey}`;
    }

    const endpoint = this.getEndpoint(profile);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: cancellationToken?.isCancellationRequested ? undefined : undefined
      });

      if (!response.ok) {
        throw new Error(`LLM API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as LLMResponse;
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message?.content || '';
      }
      
      throw new Error('No content generated by LLM');
      
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`LLM generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  private getEndpoint(profile: LLMProfile): string {
    if (profile.provider === 'custom') {
      return profile.endpoint;
    }

    switch (profile.provider) {
      case 'openai':
        return profile.endpoint || 'https://api.openai.com/v1/chat/completions';
      case 'mistral':
        return profile.endpoint || 'https://api.mistral.ai/v1/chat/completions';
      case 'openrouter':
        return profile.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
      case 'koboldcpp':
        return profile.endpoint || 'http://localhost:5001/v1/chat/completions';
      default:
        return profile.endpoint;
    }
  }

  // Utility method to create a default LLM profile
  async createDefaultProfile(name: string, provider: 'openai' | 'openrouter' | 'koboldcpp', apiKey: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error('No workspace folder open');
    }

    const profile: LLMProfile = {
      name,
      provider,
      apiKey,
      endpoint: '',
      model: provider === 'openai' ? 'gpt-4' : provider === 'openrouter' ? 'meta-llama/llama-2-70b-chat' : 'llama-2-7b-chat',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      settings: {
        temperature: 0.7,
        maxTokens: 500,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0
      },
      includeSystemContent: true,
      maxContextEntries: 10,
      created: Date.now(),
      updated: Date.now()
    };

    const profilePath = vscode.Uri.joinPath(
      workspaceFolders[0].uri,
      '.story-mode',
      'llm-profiles',
      `${name.toLowerCase().replace(/\s+/g, '-')}.json`
    );

    await vscode.workspace.fs.writeFile(
      profilePath,
      new TextEncoder().encode(JSON.stringify(profile, null, 2))
    );
  }
}
