import * as vscode from 'vscode';
import fetch from 'node-fetch';
import type { LLMProfile, RepositoryItem, Template, InlineContinuationOptions, StreamingReliabilityOptions } from '../types';
import { TemplateEngine } from '../lib/template-engine';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_AUTHOR_NOTE } from '../lib/system-prompt-presets';

const DEFAULT_SYSTEM_PROMPT_FALLBACK = `You are an AI assistant helping with creative writing and interactive storytelling. Continue the story naturally, maintaining consistency with the established tone, characters, and setting. Keep responses engaging and appropriate for the context.`;

export interface LLMGenerationOptions {
  repositoryItems?: RepositoryItem[];
  maxContextLength: number;
  includeRepositoryContext: boolean;
  llmProfile?: string;
  template?: Template; // Add template for inheritance
}

export interface StreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface ContextOptimizationOptions {
  prioritizeRecent: boolean;
  includeRepositoryItems: boolean;
  maxTokens: number;
  preserveDialogue: boolean;
}

export class LLMService {
  private templateEngine: TemplateEngine;

  constructor(private context: vscode.ExtensionContext) {
    this.templateEngine = new TemplateEngine();
  }

  async generateContinuation(
    textBeforeCursor: string, 
    options: LLMGenerationOptions,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string> {
    // Get LLM profile from settings or use default
    const profileKey = options.llmProfile || vscode.workspace.getConfiguration('storyMode').get('defaultLLMProfile', '');
    const baseProfile = await this.getLLMProfile(profileKey);
    
    if (!baseProfile) {
      throw new Error('No LLM profile configured. Please set up an LLM profile in settings.');
    }

    // Apply template inheritance if template is provided
    const effectiveProfile = options.template ? 
      this.templateEngine.createEffectiveLLMProfile(options.template, baseProfile) : 
      baseProfile;

    // Build context with repository items
    let context = this.truncateContext(textBeforeCursor, options.maxContextLength);
    
    if (options.includeRepositoryContext && options.repositoryItems && options.repositoryItems.length > 0) {
      const repositoryContext = this.buildRepositoryContext(options.repositoryItems);
      context = repositoryContext + '\n\n' + context;
    }

    // Make LLM request with effective profile
    return await this.callLLM(effectiveProfile, context, cancellationToken);
  }

  /**
   * Generate continuation with streaming support
   */
  async generateStreamingContinuation(
    textBeforeCursor: string,
    streamingOptions: StreamingOptions = {},
    options?: LLMGenerationOptions,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string> {
    // Get LLM profile from settings or use default
    const profileKey = options?.llmProfile || vscode.workspace.getConfiguration('storyMode').get('defaultLLMProfile', '');
    const baseProfile = await this.getLLMProfile(profileKey);
    
    if (!baseProfile) {
      throw new Error('No LLM profile configured. Please set up an LLM profile in settings.');
    }

    // Apply template inheritance if template is provided
    const effectiveProfile = options?.template ? 
      this.templateEngine.createEffectiveLLMProfile(options.template, baseProfile) : 
      baseProfile;

    // Use optimized context if we have repository items, otherwise use simple context
    let context: string;
    if (options?.repositoryItems && options.repositoryItems.length > 0) {
      context = this.optimizeContext(textBeforeCursor, {
        prioritizeRecent: true,
        includeRepositoryItems: true,
        maxTokens: effectiveProfile.settings.maxTokens || 4000,
        preserveDialogue: true
      }, options.repositoryItems);
    } else {
      context = this.truncateContext(textBeforeCursor, options?.maxContextLength || 4000);
    }

    // Get streaming configuration
    const config = vscode.workspace.getConfiguration('storyMode');
    const reliabilityOptions: StreamingReliabilityOptions = {
      enableFallback: config.get('streamingFallback', true),
      maxRetries: config.get('streamingMaxRetries', 2),
      retryDelayMs: config.get('streamingRetryDelayMs', 1000),
      timeoutMs: config.get('streamingTimeoutMs', 30000),
      fallbackToNonStreaming: config.get('streamingFallback', true),
      exponentialBackoff: true
    };

    // Check if provider supports streaming
    if (this.supportsStreaming(effectiveProfile)) {
      try {
        return await this.streamLLMRequestWithRetry(effectiveProfile, context, streamingOptions, reliabilityOptions, cancellationToken);
      } catch (error) {
        // If fallback is enabled and this is a streaming failure, try non-streaming
        if (reliabilityOptions.fallbackToNonStreaming && error instanceof Error) {
          console.warn('Streaming failed, falling back to non-streaming:', error.message);
          
          // Notify user of fallback through progress notification
          if (streamingOptions.onError) {
            streamingOptions.onError(new Error(`Streaming unavailable, using standard mode: ${this.categorizeError(error)}`));
          }
          
          const result = await this.callLLM(effectiveProfile, context, cancellationToken);
          if (streamingOptions.onComplete) {
            streamingOptions.onComplete(result);
          }
          return result;
        }
        throw error;
      }
    } else {
      // Fallback to non-streaming
      const result = await this.callLLM(effectiveProfile, context, cancellationToken);
      if (streamingOptions.onComplete) {
        streamingOptions.onComplete(result);
      }
      return result;
    }
  }

  /**
   * Get the active LLM profile (exposes profile access for external use)
   */
  async getActiveProfile(profileKey?: string): Promise<LLMProfile | null> {
    const key = profileKey || vscode.workspace.getConfiguration('storyMode').get('defaultLLMProfile', '');
    return await this.getLLMProfile(key);
  }

  /**
   * Check if streaming is supported for the current profile
   */
  async supportsStreamingForProfile(profileKey?: string): Promise<boolean> {
    const profile = await this.getActiveProfile(profileKey);
    return profile ? this.supportsStreaming(profile) : false;
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

  /**
   * Smart context optimization (from StreamingLLMService)
   */
  private optimizeContext(
    text: string,
    options: ContextOptimizationOptions,
    repositoryItems: RepositoryItem[] = []
  ): string {
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const maxChars = options.maxTokens * 4;
    let context = '';

    // Add repository context first if enabled
    if (options.includeRepositoryItems && repositoryItems.length > 0) {
      const repoContext = this.buildRepositoryContext(repositoryItems);
      context += repoContext + '\n\n';
    }

    // If text is too long, apply intelligent truncation
    if (text.length + context.length > maxChars) {
      const availableChars = maxChars - context.length;
      
      if (options.prioritizeRecent) {
        // Keep the most recent text, but try to preserve dialogue and important sections
        context += this.intelligentTruncation(text, availableChars, options.preserveDialogue);
      } else {
        // Simple truncation from the end
        context += text.slice(-availableChars);
      }
    } else {
      context += text;
    }

    return context;
  }

  /**
   * Intelligent truncation that preserves important content
   */
  private intelligentTruncation(text: string, maxChars: number, preserveDialogue: boolean): string {
    if (text.length <= maxChars) {
      return text;
    }

    // Start with the most recent text
    let truncated = text.slice(-maxChars);
    
    if (preserveDialogue) {
      // Find dialogue markers and try to include complete conversations
      const dialogueMarkers = ['"', "'", ':', '—', '–', '"', '"'];
      let dialogueStart = -1;
      
      for (const marker of dialogueMarkers) {
        const index = truncated.indexOf(marker);
        if (index !== -1 && (dialogueStart === -1 || index < dialogueStart)) {
          dialogueStart = index;
        }
      }
      
      if (dialogueStart > 0) {
        // Start from the dialogue to preserve context
        truncated = truncated.slice(dialogueStart);
      }
    }
    
    // Try to start at a sentence boundary
    const sentenceBoundary = truncated.search(/[.!?]\s+[A-Z]/);
    if (sentenceBoundary > 0 && sentenceBoundary < truncated.length * 0.3) {
      truncated = truncated.slice(sentenceBoundary + 2);
    }

    return truncated;
  }

  /**
   * Check if provider supports streaming
   */
  private supportsStreaming(profile: LLMProfile): boolean {
    return ['openai', 'koboldcpp', 'custom'].includes(profile.provider);
  }

  /**
   * Categorize error for user-friendly messages
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network connection issue';
    } else if (message.includes('401') || message.includes('unauthorized')) {
      return 'authentication error';
    } else if (message.includes('429') || message.includes('rate limit')) {
      return 'rate limit exceeded';
    } else if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'server error';
    } else if (message.includes('cancelled')) {
      return 'request cancelled';
    } else {
      return 'connection error';
    }
  }

  /**
   * Enhanced streaming request with retry logic and fallback
   */
  private async streamLLMRequestWithRetry(
    profile: LLMProfile,
    context: string,
    streamingOptions: StreamingOptions,
    reliabilityOptions: StreamingReliabilityOptions,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= reliabilityOptions.maxRetries) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Streaming timeout after ${reliabilityOptions.timeoutMs}ms`));
          }, reliabilityOptions.timeoutMs);
        });

        // Race between streaming request and timeout
        const streamingPromise = this.streamLLMRequest(profile, context, streamingOptions, cancellationToken);
        
        return await Promise.race([streamingPromise, timeoutPromise]);

      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry this error
        if (this.shouldRetryStreamingError(error as Error, retryCount, reliabilityOptions)) {
          retryCount++;
          
          // Calculate delay with exponential backoff if enabled
          const delay = reliabilityOptions.exponentialBackoff 
            ? reliabilityOptions.retryDelayMs * Math.pow(2, retryCount - 1)
            : reliabilityOptions.retryDelayMs;
          
          console.log(`Streaming retry ${retryCount}/${reliabilityOptions.maxRetries} after ${delay}ms delay`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If not retryable or max retries reached, throw the error
        throw error;
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error('Streaming failed after maximum retries');
  }

  /**
   * Determine if a streaming error should trigger a retry
   */
  private shouldRetryStreamingError(error: Error, retryCount: number, options: StreamingReliabilityOptions): boolean {
    // Don't retry if we've hit the max
    if (retryCount >= options.maxRetries) {
      return false;
    }

    // Don't retry cancelled requests
    if (error.message.includes('cancelled')) {
      return false;
    }

    // Retry network errors, timeouts, and server errors
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('timeout') ||
           message.includes('500') ||
           message.includes('502') ||
           message.includes('503') ||
           message.includes('stream') ||
           message.includes('connection');
  }

  /**
   * Stream LLM request with real-time updates
   */
  private async streamLLMRequest(
    profile: LLMProfile,
    context: string,
    streamingOptions: StreamingOptions,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string> {
    const messages = [
      { role: 'system' as const, content: this.getSystemPrompt(profile) },
      { role: 'user' as const, content: context }
    ];

    const requestBody = {
      messages,
      model: profile.model,
      temperature: profile.settings.temperature || 0.7,
      max_tokens: profile.settings.maxTokens || 500,
      stream: true,
      ...this.getProviderSpecificParams(profile)
    };

    let fullResponse = '';
    
    try {
      const response = await fetch(this.getEndpoint(profile), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile.apiKey}`,
          ...this.getProviderSpecificHeaders(profile)
        },
        body: JSON.stringify(requestBody),
        signal: cancellationToken?.isCancellationRequested ? undefined : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response stream available');
      }

      // Use Node.js stream instead of browser ReadableStream
      const stream = response.body as any; // Cast to any to handle both browser and Node.js stream types
      let buffer = '';
      
      return new Promise<string>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          if (cancellationToken?.isCancellationRequested) {
            if (stream.destroy) {
              stream.destroy();
            }
            reject(new Error('Request cancelled'));
            return;
          }

          buffer += chunk.toString();
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                if (streamingOptions.onComplete) {
                  streamingOptions.onComplete(fullResponse);
                }
                resolve(fullResponse);
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                const token = this.extractTokenFromResponse(parsed, profile.provider);
                
                if (token) {
                  fullResponse += token;
                  if (streamingOptions.onToken) {
                    streamingOptions.onToken(token);
                  }
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
                console.warn('Failed to parse streaming chunk:', data);
              }
            }
          }
        });

        stream.on('end', () => {
          if (streamingOptions.onComplete) {
            streamingOptions.onComplete(fullResponse);
          }
          resolve(fullResponse);
        });

        stream.on('error', (error: Error) => {
          if (streamingOptions.onError) {
            streamingOptions.onError(error);
          }
          reject(error);
        });
      });

    } catch (error) {
      if (streamingOptions.onError) {
        streamingOptions.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Extract token from streaming response based on provider
   */
  private extractTokenFromResponse(response: any, provider: string): string {
    switch (provider) {
      case 'openai':
      case 'mistral':
      case 'custom':
      default:
        return response.choices?.[0]?.delta?.content || '';
      case 'koboldcpp':
        return response.choices?.[0]?.text || response.choices?.[0]?.delta?.content || '';
    }
  }

  /**
   * Get provider-specific parameters
   */
  private getProviderSpecificParams(profile: LLMProfile): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (profile.provider === 'koboldcpp') {
      const settings = profile.settings;
      if (settings.topK) params.top_k = settings.topK;
      if (settings.topP) params.top_p = settings.topP;
      if (settings.repPen) params.rep_pen = settings.repPen;
      if (settings.repPenRange) params.rep_pen_range = settings.repPenRange;
    }
    
    return params;
  }

  /**
   * Get provider-specific headers
   */
  private getProviderSpecificHeaders(profile: LLMProfile): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (profile.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://vscode-story-mode';
    }
    
    return headers;
  }

  /**
   * Get system prompt
   */
  private getSystemPrompt(profile: LLMProfile): string {
    return profile.systemPrompt || this.getDefaultSystemPrompt();
  }

  /**
   * Get default system prompt from settings or fallback
   */
  private getDefaultSystemPrompt(): string {
    const config = vscode.workspace.getConfiguration('storyMode');
    const defaultSystemPrompt = config.get<string>('defaultSystemPrompt', '');
    return defaultSystemPrompt || DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Get default author's note from settings or fallback
   */
  private getDefaultAuthorNote(): string {
    const config = vscode.workspace.getConfiguration('storyMode');
    const defaultAuthorNote = config.get<string>('defaultAuthorNote', '');
    return defaultAuthorNote || DEFAULT_AUTHOR_NOTE;
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
    const systemPrompt = profile.systemPrompt || this.getDefaultSystemPrompt();
    
    // Add author's note at the end of the prompt if present
    let finalPrompt = prompt;
    const authorNote = profile.authorNote || this.getDefaultAuthorNote();
    if (authorNote) {
      finalPrompt += `\n\n[Author's Note: ${authorNote}]`;
    }
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: finalPrompt }
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

      const data = await response.json() as any;
      
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
      systemPrompt: this.getDefaultSystemPrompt(),
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
