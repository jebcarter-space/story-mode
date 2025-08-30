import type { LLMProfile, LLMProfileList } from '../data/types';

export function getDefaultLLMProfiles(): LLMProfileList {
  const now = Date.now();
  
  return {
    openai_creative: {
      name: "OpenAI Creative",
      provider: 'openai',
      apiKey: '',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      settings: {
        temperature: 0.8,
        maxTokens: 500,
        topP: 1.0,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3
      },
      includeSystemContent: false,
      maxContextEntries: 15,
      created: now,
      updated: now
    },
    openai_balanced: {
      name: "OpenAI Balanced",
      provider: 'openai',
      apiKey: '',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      settings: {
        temperature: 0.7,
        maxTokens: 400,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0
      },
      includeSystemContent: true,
      maxContextEntries: 10,
      created: now,
      updated: now
    },
    mistral_creative: {
      name: "Mistral Creative",
      provider: 'mistral',
      apiKey: '',
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
      model: 'mistral-medium',
      settings: {
        temperature: 0.9,
        maxTokens: 600,
        topP: 1.0,
        frequencyPenalty: 0.3,
        presencePenalty: 0.2
      },
      includeSystemContent: false,
      maxContextEntries: 12,
      created: now,
      updated: now
    },
    openrouter_llama: {
      name: "OpenRouter Llama",
      provider: 'openrouter',
      apiKey: '',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'meta-llama/llama-2-70b-chat',
      settings: {
        temperature: 0.8,
        maxTokens: 500,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      },
      includeSystemContent: false,
      maxContextEntries: 8,
      created: now,
      updated: now
    },
    koboldcpp_local: {
      name: "KoboldCPP (Local/Tunnel)",
      provider: 'koboldcpp',
      apiKey: '',
      endpoint: 'http://localhost:5001/v1/chat/completions',
      model: 'local-model',
      settings: {
        temperature: 0.7,
        maxTokens: 400,
        topP: 0.95,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0
      },
      includeSystemContent: true,
      maxContextEntries: 20,
      created: now,
      updated: now
    }
  };
}

export function loadDefaultLLMProfiles(): void {
  const stored = localStorage.getItem('llm-profiles');
  const existing = stored ? JSON.parse(stored) : {};
  
  // Only add default profiles that don't already exist
  const defaults = getDefaultLLMProfiles();
  const merged = { ...defaults, ...existing };
  
  localStorage.setItem('llm-profiles', JSON.stringify(merged));
}