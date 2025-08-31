import * as vscode from 'vscode';
import type { LLMService } from '../services/llm-service';
import type { RepositoryManager } from '../services/repository-manager';

export interface PlaceholderResolverOptions {
  llmService?: LLMService;
  repositoryManager?: RepositoryManager;
  maxDepth?: number;
  currentContext?: string; // Current document text for context
}

export class PlaceholderResolver {
  private maxDepth: number;
  private llmService?: LLMService;
  private repositoryManager?: RepositoryManager;
  private currentContext: string;

  constructor(options: PlaceholderResolverOptions = {}) {
    this.maxDepth = options.maxDepth || 10;
    this.llmService = options.llmService;
    this.repositoryManager = options.repositoryManager;
    this.currentContext = options.currentContext || '';
  }

  public async resolve(text: string, depth: number = 0): Promise<string> {
    if (depth >= this.maxDepth) {
      console.warn('Maximum placeholder resolution depth reached');
      return text;
    }

    // Handle LLM-powered placeholders first: {{#llm}}prompt{{/llm}}
    text = await this.resolveLLMPlaceholders(text);

    // Handle repository-aware placeholders: {{random_character}}, {{location_tavern}}
    text = await this.resolveRepositoryPlaceholders(text);

    // Handle basic placeholders recursively
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(text.matchAll(placeholderRegex));
    
    for (const match of matches) {
      const placeholder = match[1].trim();
      const replacement = await this.resolveSinglePlaceholder(placeholder);
      if (replacement !== placeholder) {
        text = text.replace(match[0], replacement);
        // Recursively resolve any new placeholders that may have been introduced
        return this.resolve(text, depth + 1);
      }
    }

    return text;
  }

  private async resolveLLMPlaceholders(text: string): Promise<string> {
    if (!this.llmService) {
      return text;
    }

    const llmRegex = /\{\{#llm\}\}(.*?)\{\{\/llm\}\}/gs;
    const matches = Array.from(text.matchAll(llmRegex));

    for (const match of matches) {
      const prompt = match[1].trim();
      if (!prompt) continue;

      try {
        // Create a simple template for LLM expansion
        const dummyTemplate = {
          name: 'LLM Expansion',
          description: 'Dynamic LLM content',
          content: '',
          category: 'Dynamic',
          created: Date.now(),
          updated: Date.now(),
          llmEnabled: true,
          llmInstructions: prompt,
          llmProfile: undefined // Will use default
        };

        const expandedContent = await this.llmService.expandTemplate(dummyTemplate, this.currentContext);
        text = text.replace(match[0], expandedContent.trim());
      } catch (error) {
        console.error('LLM placeholder expansion failed:', error);
        // Fallback to the original prompt
        text = text.replace(match[0], `[LLM Error: ${prompt}]`);
      }
    }

    return text;
  }

  private async resolveRepositoryPlaceholders(text: string): Promise<string> {
    if (!this.repositoryManager) {
      return text;
    }

    // Handle {{random_character}}, {{random_location}}, etc.
    const repositoryRegex = /\{\{random_([a-zA-Z]+)\}\}/g;
    const matches = Array.from(text.matchAll(repositoryRegex));

    for (const match of matches) {
      const categoryType = match[1];
      let category: string;

      // Map category types to repository categories
      switch (categoryType.toLowerCase()) {
        case 'character':
        case 'characters':
          category = 'Character';
          break;
        case 'location':
        case 'locations':
          category = 'Location';
          break;
        case 'object':
        case 'objects':
        case 'item':
        case 'items':
          category = 'Object';
          break;
        case 'situation':
        case 'situations':
        case 'event':
        case 'events':
          category = 'Situation';
          break;
        default:
          continue; // Skip unknown categories
      }

      try {
        const repositories = await this.repositoryManager.getRepositoriesByCategory(category as any);
        const repositoryKeys = Object.keys(repositories);
        
        if (repositoryKeys.length > 0) {
          // Pick a random repository item
          const randomKey = repositoryKeys[Math.floor(Math.random() * repositoryKeys.length)];
          const randomItem = repositories[randomKey];
          text = text.replace(match[0], randomItem.name);
        } else {
          text = text.replace(match[0], `[No ${category} items found]`);
        }
      } catch (error) {
        console.error(`Failed to resolve repository placeholder for ${category}:`, error);
        text = text.replace(match[0], `[Repository Error: ${categoryType}]`);
      }
    }

    return text;
  }

  private async resolveSinglePlaceholder(placeholder: string): Promise<string> {
    // Handle basic placeholder patterns
    // For now, just return the placeholder unchanged if it doesn't match any pattern
    // This could be extended with dice rolling, random numbers, etc.
    
    // Handle random numbers: rand 1-10
    if (placeholder.startsWith('rand ')) {
      const rangeStr = placeholder.substring(5);
      const match = rangeStr.match(/(\d+)-(\d+)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        const result = Math.floor(Math.random() * (max - min + 1)) + min;
        return result.toString();
      }
    }

    // Handle dice rolls: roll 1d20, roll 3d6+2
    if (placeholder.startsWith('roll ')) {
      const diceStr = placeholder.substring(5);
      return this.rollDice(diceStr);
    }

    // Return unchanged for unknown placeholders
    return placeholder;
  }

  private rollDice(notation: string): string {
    try {
      // Simple dice rolling implementation
      // Format: XdY+Z or XdY-Z or XdY
      const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/);
      if (!match) {
        return `[Invalid dice: ${notation}]`;
      }

      const numDice = parseInt(match[1]);
      const numSides = parseInt(match[2]);
      const modifier = match[3] ? parseInt(match[3]) : 0;

      if (numDice <= 0 || numSides <= 0) {
        return `[Invalid dice: ${notation}]`;
      }

      let total = 0;
      for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * numSides) + 1;
      }

      total += modifier;
      return total.toString();
    } catch (error) {
      return `[Dice error: ${notation}]`;
    }
  }
}