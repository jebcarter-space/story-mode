import { LLMService } from './llm-service';
import type { 
  LLMProfile, 
  RepositoryItem, 
  RepositoryCategory, 
  RepositoryContext,
  ContentData
} from '../data/types';

export interface ExtractedEntity {
  name: string;
  description: string;
  category: RepositoryCategory;
  keywords: string[];
  confidence: number;
  sourceText: string;
}

export interface ExtractionSuggestion {
  id: string;
  entity: ExtractedEntity;
  approved: boolean;
  rejected: boolean;
  timestamp: number;
}

export interface AutoExtractionSettings {
  enabled: boolean;
  minConfidence: number;
  maxSuggestionsPerSession: number;
  categories: RepositoryCategory[];
  autoApproveHighConfidence: boolean;
  highConfidenceThreshold: number;
}

export class AutoExtractionService {
  private llmService: LLMService;
  private settings: AutoExtractionSettings;
  private pendingSuggestions: Map<string, ExtractionSuggestion> = new Map();
  private extractionHistory: Set<string> = new Set();

  constructor(profile: LLMProfile, settings?: Partial<AutoExtractionSettings>) {
    this.llmService = new LLMService(profile);
    this.settings = {
      enabled: true,
      minConfidence: 0.6,
      maxSuggestionsPerSession: 10,
      categories: ['Character', 'Location', 'Object', 'Situation'],
      autoApproveHighConfidence: false,
      highConfidenceThreshold: 0.9,
      ...settings
    };
  }

  /**
   * Extract entities from story content using LLM analysis
   */
  async extractEntities(content: string, context?: RepositoryContext): Promise<ExtractedEntity[]> {
    if (!this.settings.enabled || !content.trim()) {
      return [];
    }

    try {
      const extractionPrompt = this.buildExtractionPrompt(content);
      const response = await this.llmService.generate({
        context: [{
          type: 'input',
          input: extractionPrompt,
          output: ''
        }],
        maxContextEntries: 1,
        includeSystemContent: false
      });

      return this.parseExtractionResponse(response, content);
    } catch (error) {
      console.warn('Auto-extraction failed:', error);
      return [];
    }
  }

  /**
   * Create suggestions from extracted entities
   */
  createSuggestions(entities: ExtractedEntity[]): ExtractionSuggestion[] {
    const suggestions: ExtractionSuggestion[] = [];
    
    for (const entity of entities) {
      // Skip if confidence is too low
      if (entity.confidence < this.settings.minConfidence) {
        continue;
      }

      // Skip if we've already seen this entity (basic deduplication)
      const entityKey = `${entity.category}:${entity.name.toLowerCase()}`;
      if (this.extractionHistory.has(entityKey)) {
        continue;
      }

      // Check if we've reached max suggestions
      if (suggestions.length >= this.settings.maxSuggestionsPerSession) {
        break;
      }

      const suggestion: ExtractionSuggestion = {
        id: crypto.randomUUID(),
        entity,
        approved: this.settings.autoApproveHighConfidence && 
                 entity.confidence >= this.settings.highConfidenceThreshold,
        rejected: false,
        timestamp: Date.now()
      };

      suggestions.push(suggestion);
      this.pendingSuggestions.set(suggestion.id, suggestion);
    }

    return suggestions;
  }

  /**
   * Approve a suggestion and convert it to a repository item
   */
  approveSuggestion(suggestionId: string, scope: 'chapter' | 'book' | 'shelf' | 'library', scopeContext: RepositoryContext): RepositoryItem | null {
    const suggestion = this.pendingSuggestions.get(suggestionId);
    if (!suggestion || suggestion.rejected) {
      return null;
    }

    const entity = suggestion.entity;
    const entityKey = `${entity.category}:${entity.name.toLowerCase()}`;
    
    // Mark as approved and add to history
    suggestion.approved = true;
    this.extractionHistory.add(entityKey);

    // Create repository item
    const repositoryItem: RepositoryItem = {
      name: entity.name,
      description: entity.description,
      keywords: entity.keywords,
      content: entity.description,
      forceInContext: false,
      category: entity.category,
      created: Date.now(),
      updated: Date.now(),
      scope,
      scopeContext: {
        chapterId: scopeContext.chapterId,
        bookId: scopeContext.bookId,
        shelfId: scopeContext.shelfId
      },
      workbookTags: []
    };

    return repositoryItem;
  }

  /**
   * Reject a suggestion
   */
  rejectSuggestion(suggestionId: string): void {
    const suggestion = this.pendingSuggestions.get(suggestionId);
    if (suggestion) {
      suggestion.rejected = true;
      suggestion.approved = false;
      
      // Still add to history to avoid re-suggesting
      const entityKey = `${suggestion.entity.category}:${suggestion.entity.name.toLowerCase()}`;
      this.extractionHistory.add(entityKey);
    }
  }

  /**
   * Get pending suggestions
   */
  getPendingSuggestions(): ExtractionSuggestion[] {
    return Array.from(this.pendingSuggestions.values())
      .filter(s => !s.approved && !s.rejected)
      .sort((a, b) => b.entity.confidence - a.entity.confidence);
  }

  /**
   * Clear processed suggestions
   */
  clearProcessedSuggestions(): void {
    for (const [id, suggestion] of this.pendingSuggestions.entries()) {
      if (suggestion.approved || suggestion.rejected) {
        this.pendingSuggestions.delete(id);
      }
    }
  }

  /**
   * Update extraction settings
   */
  updateSettings(newSettings: Partial<AutoExtractionSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Build the extraction prompt for the LLM
   */
  private buildExtractionPrompt(content: string): string {
    const categories = this.settings.categories.join(', ');
    
    return `Analyze the following story content and extract important story elements. Return a JSON array of objects with the following structure:

{
  "name": "entity name",
  "description": "brief description",
  "category": "Character|Location|Object|Situation",
  "keywords": ["keyword1", "keyword2"],
  "confidence": 0.8
}

Focus on extracting:
- Characters: Named people, creatures, or entities with agency
- Locations: Places, buildings, regions, or settings
- Objects: Important items, tools, magical items, or significant objects
- Situations: Ongoing events, conflicts, relationships, or conditions

Only extract entities that are clearly significant to the story. Set confidence between 0.0 and 1.0 based on how certain you are that this is an important story element.

Story content:
${content}

Return only the JSON array, no additional text:`;
  }

  /**
   * Parse the LLM response into extracted entities
   */
  private parseExtractionResponse(response: string, sourceText: string): ExtractedEntity[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in extraction response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        console.warn('Extraction response is not an array');
        return [];
      }

      return parsed
        .filter(item => this.isValidExtractedEntity(item))
        .map(item => ({
          ...item,
          sourceText: sourceText.slice(0, 200) + (sourceText.length > 200 ? '...' : ''),
          confidence: Math.min(1.0, Math.max(0.0, item.confidence || 0.5))
        }));
    } catch (error) {
      console.warn('Failed to parse extraction response:', error);
      return [];
    }
  }

  /**
   * Validate that an extracted entity has the required fields
   */
  private isValidExtractedEntity(item: any): boolean {
    return (
      typeof item === 'object' &&
      typeof item.name === 'string' &&
      item.name.trim().length > 0 &&
      typeof item.description === 'string' &&
      item.description.trim().length > 0 &&
      typeof item.category === 'string' &&
      ['Character', 'Location', 'Object', 'Situation'].includes(item.category) &&
      Array.isArray(item.keywords) &&
      item.keywords.every((k: any) => typeof k === 'string')
    );
  }
}