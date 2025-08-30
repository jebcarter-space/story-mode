import type { 
  RepositoryItem, 
  RepositoryList, 
  RepositoryContext, 
  ResolvedRepositoryItem, 
  KeywordResolution,
  Workbook 
} from '../data/types';

export class RepositoryResolver {
  private repositories: RepositoryList;
  private workbooks: Workbook[];
  private context: RepositoryContext;

  constructor(repositories: RepositoryList, workbooks: Workbook[], context: RepositoryContext) {
    this.repositories = repositories;
    this.workbooks = workbooks;
    this.context = context;
  }

  /**
   * Get all repository items that are in scope for the current context
   */
  getItemsInScope(): ResolvedRepositoryItem[] {
    const itemsInScope: ResolvedRepositoryItem[] = [];

    for (const [key, item] of Object.entries(this.repositories)) {
      const scopeLevel = this.getItemScopeLevel(item);
      if (scopeLevel) {
        itemsInScope.push({
          item,
          key,
          source: scopeLevel
        });
      }
    }

    return itemsInScope;
  }

  /**
   * Get items that match specific keywords with conflict resolution
   */
  getMatchingKeywords(text: string): KeywordResolution[] {
    const lowerText = text.toLowerCase();
    const keywordMatches = new Map<string, ResolvedRepositoryItem[]>();

    // Find all matching items
    for (const [key, item] of Object.entries(this.repositories)) {
      const scopeLevel = this.getItemScopeLevel(item);
      if (!scopeLevel) continue; // Skip out-of-scope items

      for (const keyword of item.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          const resolvedItem: ResolvedRepositoryItem = {
            item,
            key,
            source: scopeLevel
          };

          if (!keywordMatches.has(keyword)) {
            keywordMatches.set(keyword, []);
          }
          keywordMatches.get(keyword)!.push(resolvedItem);
          break; // Only add once per item
        }
      }
    }

    // Process each keyword group
    const resolutions: KeywordResolution[] = [];
    for (const [keyword, items] of keywordMatches) {
      // Apply workbook master scope overrides
      const processedItems = this.applyWorkbookOverrides(items);
      
      // Sort by scope priority (Library → Shelf → Book → Chapter)
      const sortedItems = this.sortByScope(processedItems);
      
      // Concatenate content
      const concatenatedContent = sortedItems
        .map(resolved => resolved.item.content)
        .join('\n\n');

      resolutions.push({
        keyword,
        items: sortedItems,
        concatenatedContent,
        hasConflicts: sortedItems.length > 1
      });
    }

    return resolutions;
  }

  /**
   * Get items filtered by workbook tags
   */
  getItemsByWorkbookTags(tags: string[]): ResolvedRepositoryItem[] {
    const itemsInScope = this.getItemsInScope();
    
    return itemsInScope.filter(resolved => {
      return tags.some(tag => resolved.item.workbookTags.includes(tag));
    });
  }

  /**
   * Check if a repository item should be included in current context
   */
  private getItemScopeLevel(item: RepositoryItem): 'library' | 'shelf' | 'book' | 'chapter' | null {
    // Always include if forced in context
    if (item.forceInContext) {
      return this.getScopeFromItem(item);
    }

    switch (item.scope) {
      case 'library':
        return 'library';
        
      case 'shelf':
        if (item.scopeContext.shelfId === this.context.shelfId) {
          return 'shelf';
        }
        break;
        
      case 'book':
        if (item.scopeContext.shelfId === this.context.shelfId && 
            item.scopeContext.bookId === this.context.bookId) {
          return 'book';
        }
        break;
        
      case 'chapter':
        if (item.scopeContext.shelfId === this.context.shelfId && 
            item.scopeContext.bookId === this.context.bookId &&
            item.scopeContext.chapterId === this.context.chapterId) {
          return 'chapter';
        }
        break;
    }

    return null;
  }

  /**
   * Apply workbook master scope overrides
   */
  private applyWorkbookOverrides(items: ResolvedRepositoryItem[]): ResolvedRepositoryItem[] {
    return items.map(resolved => {
      // Find workbooks that contain this item
      const applicableWorkbooks = this.workbooks.filter(wb => 
        resolved.item.workbookTags.some(tag => wb.tags.includes(tag))
      );

      // Apply master scope override if any workbook has one
      for (const workbook of applicableWorkbooks) {
        if (workbook.masterScope && this.isWorkbookScopeApplicable(workbook)) {
          return {
            ...resolved,
            source: workbook.masterScope
          };
        }
      }

      return resolved;
    });
  }

  /**
   * Check if workbook's master scope applies to current context
   */
  private isWorkbookScopeApplicable(workbook: Workbook): boolean {
    if (!workbook.masterScope || !workbook.masterScopeContext) {
      return true; // No restrictions
    }

    const ctx = workbook.masterScopeContext;
    
    switch (workbook.masterScope) {
      case 'library':
        return true;
        
      case 'shelf':
        return ctx.shelfId === this.context.shelfId;
        
      case 'book':
        return ctx.shelfId === this.context.shelfId && 
               ctx.bookId === this.context.bookId;
               
      case 'chapter':
        return ctx.shelfId === this.context.shelfId && 
               ctx.bookId === this.context.bookId &&
               ctx.chapterId === this.context.chapterId;
               
      default:
        return true;
    }
  }

  /**
   * Sort items by scope priority (Library → Shelf → Book → Chapter)
   */
  private sortByScope(items: ResolvedRepositoryItem[]): ResolvedRepositoryItem[] {
    const scopeOrder = { 'library': 0, 'shelf': 1, 'book': 2, 'chapter': 3 };
    
    return [...items].sort((a, b) => {
      return scopeOrder[a.source] - scopeOrder[b.source];
    });
  }

  /**
   * Get scope level from item for forced context items
   */
  private getScopeFromItem(item: RepositoryItem): 'library' | 'shelf' | 'book' | 'chapter' {
    return item.scope;
  }

  /**
   * Check for keyword conflicts when adding new items
   */
  static checkKeywordConflicts(
    newItem: RepositoryItem, 
    existingRepositories: RepositoryList,
    context: RepositoryContext
  ): { hasConflicts: boolean; conflictingItems: RepositoryItem[] } {
    const resolver = new RepositoryResolver(existingRepositories, [], context);
    const conflictingItems: RepositoryItem[] = [];

    for (const keyword of newItem.keywords) {
      const text = keyword.toLowerCase();
      const resolutions = resolver.getMatchingKeywords(text);
      
      for (const resolution of resolutions) {
        if (resolution.keyword.toLowerCase() === text && resolution.items.length > 0) {
          conflictingItems.push(...resolution.items.map(r => r.item));
        }
      }
    }

    return {
      hasConflicts: conflictingItems.length > 0,
      conflictingItems: [...new Set(conflictingItems)] // Remove duplicates
    };
  }
}

/**
 * Create a repository resolver for the current context
 */
export function createRepositoryResolver(
  repositories: RepositoryList, 
  workbooks: Workbook[], 
  context: RepositoryContext
): RepositoryResolver {
  return new RepositoryResolver(repositories, workbooks, context);
}