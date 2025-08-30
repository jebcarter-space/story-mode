import type { LLMProfile, ContentData } from '../data/types';

export interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  stream: boolean;
}

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
  context: ContentData[];
  maxContextEntries: number;
  includeSystemContent: boolean;
  signal?: AbortSignal;
}

export class LLMService {
  constructor(private profile: LLMProfile) {}

  private buildMessages(context: ContentData[], includeSystemContent: boolean): Array<{ role: 'system' | 'user' | 'assistant', content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [];
    
    // Add system message
    messages.push({
      role: 'system',
      content: 'You are a creative storytelling assistant helping to continue an interactive story. Continue the narrative naturally based on the context provided. Be descriptive and engaging while maintaining consistency with the established tone and setting.'
    });

    // Add context from story history
    for (const entry of context) {
      // Skip system content if not included
      if (!includeSystemContent && (entry.type === 'oracle' || entry.type === 'roll' || entry.type === 'task')) {
        continue;
      }

      let content = '';
      if (entry.input) {
        content += entry.input + '\n';
      }
      content += entry.output;

      // Map content types to appropriate roles
      if (entry.type === 'input' || entry.type === 'oracle') {
        messages.push({ role: 'user', content });
      } else if (entry.type === 'llm') {
        messages.push({ role: 'assistant', content: entry.output });
      } else {
        // Other types (roll, table, template, etc.) as user context
        messages.push({ role: 'user', content });
      }
    }

    return messages;
  }

  private getEndpoint(): string {
    // Use profile endpoint if custom, otherwise build standard endpoints
    if (this.profile.provider === 'custom') {
      return this.profile.endpoint;
    }

    switch (this.profile.provider) {
      case 'openai':
        return this.profile.endpoint || 'https://api.openai.com/v1/chat/completions';
      case 'mistral':
        return this.profile.endpoint || 'https://api.mistral.ai/v1/chat/completions';
      case 'openrouter':
        return this.profile.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
      case 'koboldcpp':
        return this.profile.endpoint || 'http://localhost:5001/v1/chat/completions';
      default:
        return this.profile.endpoint;
    }
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization headers based on provider
    if (this.profile.provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${this.profile.apiKey}`;
      headers['HTTP-Referer'] = window.location.origin;
    } else if (this.profile.provider === 'koboldcpp') {
      // KoboldCPP typically doesn't need auth
      if (this.profile.apiKey) {
        headers['Authorization'] = `Bearer ${this.profile.apiKey}`;
      }
    } else {
      headers['Authorization'] = `Bearer ${this.profile.apiKey}`;
    }

    return headers;
  }

  async *generateStream(options: LLMGenerationOptions): AsyncGenerator<string, void, unknown> {
    const { context, maxContextEntries, includeSystemContent, signal } = options;
    
    // Limit context to specified number of entries
    const limitedContext = context.slice(-maxContextEntries);
    const messages = this.buildMessages(limitedContext, includeSystemContent);

    const request: LLMRequest = {
      messages,
      model: this.profile.model,
      temperature: this.profile.settings.temperature,
      max_tokens: this.profile.settings.maxTokens,
      top_p: this.profile.settings.topP,
      frequency_penalty: this.profile.settings.frequencyPenalty,
      presence_penalty: this.profile.settings.presencePenalty,
      stream: true
    };

    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      try {
        const response = await fetch(this.getEndpoint(), {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(request),
          signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Check for specific error types that might benefit from retry
          if (response.status >= 500 && retries < maxRetries) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000)); // Exponential backoff
            continue;
          }
          
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() === '') continue;
              if (line.trim() === 'data: [DONE]') return;
              if (!line.startsWith('data: ')) continue;

              try {
                const data = JSON.parse(line.slice(6));
                const delta = data.choices?.[0]?.delta;
                if (delta?.content) {
                  yield delta.content;
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming response:', parseError);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        return; // Successful completion, exit retry loop
      } catch (error) {
        if (signal?.aborted) {
          throw new Error('Generation cancelled by user');
        }
        
        if (retries < maxRetries && 
            (error instanceof TypeError || // Network errors
             (error instanceof Error && error.message.includes('fetch')))) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
          continue;
        }
        
        throw error;
      }
    }
  }

  async generate(options: LLMGenerationOptions): Promise<string> {
    const { context, maxContextEntries, includeSystemContent, signal } = options;
    
    // Limit context to specified number of entries
    const limitedContext = context.slice(-maxContextEntries);
    const messages = this.buildMessages(limitedContext, includeSystemContent);

    const request: Omit<LLMRequest, 'stream'> & { stream: false } = {
      messages,
      model: this.profile.model,
      temperature: this.profile.settings.temperature,
      max_tokens: this.profile.settings.maxTokens,
      top_p: this.profile.settings.topP,
      frequency_penalty: this.profile.settings.frequencyPenalty,
      presence_penalty: this.profile.settings.presencePenalty,
      stream: false
    };

    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      try {
        const response = await fetch(this.getEndpoint(), {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(request),
          signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Check for specific error types that might benefit from retry
          if (response.status >= 500 && retries < maxRetries) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000)); // Exponential backoff
            continue;
          }
          
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data: LLMResponse = await response.json();
        return data.choices?.[0]?.message?.content || '';
      } catch (error) {
        if (signal?.aborted) {
          throw new Error('Generation cancelled by user');
        }
        
        if (retries < maxRetries && 
            (error instanceof TypeError || // Network errors
             (error instanceof Error && error.message.includes('fetch')))) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Maximum retries exceeded');
  }

  // Test connection to the API
  async testConnection(): Promise<boolean> {
    try {
      const testMessages = [{
        role: 'user' as const,
        content: 'Hello'
      }];

      const request = {
        messages: testMessages,
        model: this.profile.model,
        temperature: 0.1,
        max_tokens: 5,
        stream: false
      };

      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(request)
      });

      return response.ok;
    } catch (error) {
      console.warn('Connection test failed:', error);
      return false;
    }
  }
}