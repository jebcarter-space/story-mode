import type { RepositoryItem, RepositoryContext } from '../data/types';
import { createRepositoryResolver } from './repository-resolver';

export interface StoryContextData {
  currentContext: RepositoryContext;
  availableRepositoryItems: RepositoryItem[];
  contextDescription: string;
  relatedCharacters: RepositoryItem[];
  relatedLocations: RepositoryItem[];
  relatedObjects: RepositoryItem[];
  relatedSituations: RepositoryItem[];
}

export class StoryContextService {
  constructor(
    private repositories: any,
    private workbooks: any
  ) {}

  /**
   * Get comprehensive story context for the creative assistant
   */
  getStoryContext(repositoryContext: RepositoryContext): StoryContextData {
    const resolver = createRepositoryResolver(
      this.repositories.value,
      this.workbooks.getAllWorkbooks(),
      repositoryContext
    );

    // Get all repository items in scope
    const itemsInScope = resolver.getItemsInScope();
    const availableItems = itemsInScope.map(resolved => resolved.item);
    
    // Force context items (always included)
    const forcedItems = this.repositories.getForced();

    // Combine and deduplicate
    const allItems = [...forcedItems, ...availableItems];
    const uniqueItems = this.deduplicateItems(allItems);

    // Categorize items
    const relatedCharacters = uniqueItems.filter(item => item.category === 'Character');
    const relatedLocations = uniqueItems.filter(item => item.category === 'Location');
    const relatedObjects = uniqueItems.filter(item => item.category === 'Object');
    const relatedSituations = uniqueItems.filter(item => item.category === 'Situation');

    return {
      currentContext: repositoryContext,
      availableRepositoryItems: uniqueItems,
      contextDescription: this.generateContextDescription(repositoryContext, uniqueItems),
      relatedCharacters,
      relatedLocations,
      relatedObjects,
      relatedSituations
    };
  }

  /**
   * Get repository items that match specific keywords from a query
   */
  getMatchingItems(query: string, repositoryContext: RepositoryContext): RepositoryItem[] {
    const resolver = createRepositoryResolver(
      this.repositories.value,
      this.workbooks.getAllWorkbooks(),
      repositoryContext
    );

    const keywordMatches = resolver.getMatchingKeywords(query);
    return keywordMatches.map(match => match.item);
  }

  /**
   * Generate a human-readable description of the current context
   */
  private generateContextDescription(context: RepositoryContext, items: RepositoryItem[]): string {
    const parts: string[] = [];

    if (context.chapterId) {
      parts.push(`Chapter: ${context.chapterId}`);
    }
    if (context.bookId) {
      parts.push(`Book: ${context.bookId}`);
    }
    if (context.shelfId) {
      parts.push(`Shelf: ${context.shelfId}`);
    }

    let description = parts.length > 0 ? parts.join(' > ') : 'Library';

    if (items.length > 0) {
      const categoryCounts = this.getCategoryCounts(items);
      const counts: string[] = [];
      
      if (categoryCounts.Character > 0) counts.push(`${categoryCounts.Character} character${categoryCounts.Character > 1 ? 's' : ''}`);
      if (categoryCounts.Location > 0) counts.push(`${categoryCounts.Location} location${categoryCounts.Location > 1 ? 's' : ''}`);
      if (categoryCounts.Object > 0) counts.push(`${categoryCounts.Object} object${categoryCounts.Object > 1 ? 's' : ''}`);
      if (categoryCounts.Situation > 0) counts.push(`${categoryCounts.Situation} situation${categoryCounts.Situation > 1 ? 's' : ''}`);

      if (counts.length > 0) {
        description += ` (${counts.join(', ')})`;
      }
    }

    return description;
  }

  /**
   * Get counts of items by category
   */
  private getCategoryCounts(items: RepositoryItem[]): Record<string, number> {
    const counts: Record<string, number> = {
      Character: 0,
      Location: 0,
      Object: 0,
      Situation: 0
    };

    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }

    return counts;
  }

  /**
   * Remove duplicate repository items based on their names
   */
  private deduplicateItems(items: RepositoryItem[]): RepositoryItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = `${item.category}:${item.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get the current context ID string for session management
   */
  getContextId(repositoryContext: RepositoryContext): string {
    const parts: string[] = [];
    
    if (repositoryContext.shelfId) parts.push(repositoryContext.shelfId);
    if (repositoryContext.bookId) parts.push(repositoryContext.bookId);
    if (repositoryContext.chapterId) parts.push(repositoryContext.chapterId);
    
    return parts.length > 0 ? parts.join('/') : 'library';
  }

  /**
   * Check if two repository contexts are the same
   */
  isContextEqual(context1: RepositoryContext, context2: RepositoryContext): boolean {
    return context1.chapterId === context2.chapterId &&
           context1.bookId === context2.bookId &&
           context1.shelfId === context2.shelfId;
  }
}