import * as vscode from 'vscode';
import fetch from 'node-fetch';
import type { LLMProfile, RepositoryItem } from '../types';

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

export class StreamingLLMService {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Generate continuation with streaming support
   */
  async generateStreamingContinuation(
    textBeforeCursor: string,
    profile: LLMProfile,
    repositoryItems: RepositoryItem[] = [],
    streamingOptions: StreamingOptions = {},
    cancellationToken?: vscode.CancellationToken
  ): Promise<string> {
    const optimizedContext = this.optimizeContext(textBeforeCursor, {
      prioritizeRecent: true,
      includeRepositoryItems: true,
      maxTokens: profile.settings.maxTokens || 4000,
      preserveDialogue: true
    }, repositoryItems);

    // Check if provider supports streaming
    if (this.supportsStreaming(profile)) {
      return await this.streamLLMRequest(profile, optimizedContext, streamingOptions, cancellationToken);
    } else {
      // Fallback to non-streaming
      const result = await this.callLLMStandard(profile, optimizedContext, cancellationToken);
      if (streamingOptions.onComplete) {
        streamingOptions.onComplete(result);
      }
      return result;
    }
  }

  /**
   * Smart context optimization
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
   * Build repository context with better formatting
   */
  private buildRepositoryContext(items: RepositoryItem[]): string {
    if (items.length === 0) return '';

    const grouped: { [category: string]: RepositoryItem[] } = {};
    items.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    let context = '--- Repository Context ---\n';
    
    for (const [category, categoryItems] of Object.entries(grouped)) {
      context += `\n${category.toUpperCase()}S:\n`;
      categoryItems.forEach(item => {
        context += `- ${item.name}`;
        if (item.description) {
          context += `: ${item.description}`;
        }
        if (item.keywords && item.keywords.length > 0) {
          context += ` (Keywords: ${item.keywords.join(', ')})`;
        }
        context += '\n';
      });
    }
    
    context += '--- End Repository Context ---\n';
    return context;
  }

  /**
   * Check if provider supports streaming
   */
  private supportsStreaming(profile: LLMProfile): boolean {
    return ['openai', 'koboldcpp', 'custom'].includes(profile.provider);
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
      { role: 'system', content: this.getSystemPrompt(profile) },
      { role: 'user', content: context }
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
      const response = await fetch(profile.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile.apiKey}`,
          ...this.getProviderSpecificHeaders(profile)
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = (response.body as any)?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      
      while (true) {
        if (cancellationToken?.isCancellationRequested) {
          reader.cancel();
          throw new Error('Request cancelled');
        }

        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              break;
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
            }
          }
        }
      }

      if (streamingOptions.onComplete) {
        streamingOptions.onComplete(fullResponse);
      }

      return fullResponse;

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
        return response.choices?.[0]?.delta?.content || '';
      case 'anthropic':
        return response.delta?.text || '';
      case 'koboldcpp':
        return response.choices?.[0]?.text || '';
      default:
        return response.choices?.[0]?.delta?.content || response.delta?.text || '';
    }
  }

  /**
   * Standard non-streaming LLM call
   */
  private async callLLMStandard(
    profile: LLMProfile,
    context: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string> {
    const messages = [
      { role: 'system', content: this.getSystemPrompt(profile) },
      { role: 'user', content: context }
    ];

    const requestBody = {
      messages,
      model: profile.model,
      temperature: profile.settings.temperature || 0.7,
      max_tokens: profile.settings.maxTokens || 500,
      stream: false,
      ...this.getProviderSpecificParams(profile)
    };

    const response = await fetch(profile.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${profile.apiKey}`,
        ...this.getProviderSpecificHeaders(profile)
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return this.extractTextFromResponse(data, profile.provider);
  }

  /**
   * Extract text from non-streaming response
   */
  private extractTextFromResponse(response: any, provider: string): string {
    switch (provider) {
      case 'openai':
        return response.choices?.[0]?.message?.content || '';
      case 'anthropic':
        return response.content?.[0]?.text || '';
      case 'koboldcpp':
        return response.choices?.[0]?.text || '';
      default:
        return response.choices?.[0]?.message?.content || '';
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
    
    // Currently no anthropic provider support, but keeping structure for future
    // if (profile.provider === 'anthropic') {
    //   headers['anthropic-version'] = '2023-06-01';
    // }
    
    return headers;
  }

  /**
   * Get system prompt
   */
  private getSystemPrompt(profile: LLMProfile): string {
    return profile.systemPrompt || 'You are an AI assistant helping with creative writing and interactive storytelling. Continue the story naturally, maintaining consistency with the established tone, characters, and setting. Keep responses engaging and appropriate for the context.';
  }
}