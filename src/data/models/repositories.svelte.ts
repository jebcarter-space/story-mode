import type { RepositoryItem, RepositoryList, RepositoryCategory, RepositoryContext } from "../types";

export function createRepositories() {
  let value = $state(JSON.parse(localStorage.getItem('repositories') || '{}'));

  // Migration function to add scoping fields to existing items
  function migrateExistingItems() {
    let needsUpdate = false;
    for (const [key, item] of Object.entries(value) as [string, RepositoryItem][]) {
      if (!item.scope) {
        // Default existing items to library-level scope
        item.scope = 'library';
        item.scopeContext = {};
        item.workbookTags = [];
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      localStorage.setItem('repositories', JSON.stringify(value));
    }
  }

  // Run migration on load
  migrateExistingItems();

  function reset() {
    value = {};
    localStorage.setItem('repositories', JSON.stringify(value));
  }

  function add(item: RepositoryItem) {
    const timestamp = Date.now();
    item.created = item.created || timestamp;
    item.updated = timestamp;
    
    // Ensure scoping fields exist
    item.scope = item.scope || 'library';
    item.scopeContext = item.scopeContext || {};
    item.workbookTags = item.workbookTags || [];
    
    // Use name as key, converting to lowercase and replacing spaces with underscores
    const key = item.name.toLowerCase().replace(/\s+/g, '_');
    value[key] = item;
    localStorage.setItem('repositories', JSON.stringify(value));
  }

  function remove(key: string) {
    delete value[key];
    localStorage.setItem('repositories', JSON.stringify(value));
  }

  function update(key: string, item: RepositoryItem) {
    if (value[key]) {
      item.created = value[key].created;
      item.updated = Date.now();
      
      // Ensure scoping fields exist
      item.scope = item.scope || 'library';
      item.scopeContext = item.scopeContext || {};
      item.workbookTags = item.workbookTags || [];
      
      value[key] = item;
      localStorage.setItem('repositories', JSON.stringify(value));
    }
  }

  function importRepositories(repositories: RepositoryList) {
    // Migrate imported items if needed
    for (const item of Object.values(repositories) as RepositoryItem[]) {
      item.scope = item.scope || 'library';
      item.scopeContext = item.scopeContext || {};
      item.workbookTags = item.workbookTags || [];
    }
    
    value = { ...value, ...repositories };
    localStorage.setItem('repositories', JSON.stringify(value));
  }

  function exportRepositories(): RepositoryList {
    return { ...value };
  }

  function getByCategory(category: RepositoryCategory): RepositoryList {
    const filtered: RepositoryList = {};
    for (const [key, item] of Object.entries(value) as [string, RepositoryItem][]) {
      if (item.category === category) {
        filtered[key] = item;
      }
    }
    return filtered;
  }

  function getCategories(): RepositoryCategory[] {
    const categories = new Set<RepositoryCategory>();
    for (const item of Object.values(value) as RepositoryItem[]) {
      categories.add(item.category);
    }
    return Array.from(categories).sort();
  }

  function getForced(): RepositoryItem[] {
    return (Object.values(value) as RepositoryItem[]).filter(item => item.forceInContext);
  }

  function getMatchingKeywords(text: string): RepositoryItem[] {
    const matches: RepositoryItem[] = [];
    const lowerText = text.toLowerCase();
    
    for (const item of Object.values(value) as RepositoryItem[]) {
      for (const keyword of item.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matches.push(item);
          break; // Only add once per item
        }
      }
    }
    
    return matches;
  }

  // Basic scoped methods (will enhance with resolver later)
  function getByScope(scope: 'chapter' | 'book' | 'shelf' | 'library'): RepositoryList {
    const filtered: RepositoryList = {};
    for (const [key, item] of Object.entries(value) as [string, RepositoryItem][]) {
      if (item.scope === scope) {
        filtered[key] = item;
      }
    }
    return filtered;
  }

  function getByWorkbookTags(tags: string[]): RepositoryList {
    const filtered: RepositoryList = {};
    for (const [key, item] of Object.entries(value) as [string, RepositoryItem][]) {
      if (tags.some(tag => item.workbookTags.includes(tag))) {
        filtered[key] = item;
      }
    }
    return filtered;
  }

  function getItemsInScope(context: RepositoryContext): RepositoryItem[] {
    const itemsInScope: RepositoryItem[] = [];
    
    for (const item of Object.values(value) as RepositoryItem[]) {
      // Always include if forced in context
      if (item.forceInContext) {
        itemsInScope.push(item);
        continue;
      }

      // Check scope
      switch (item.scope) {
        case 'library':
          itemsInScope.push(item);
          break;
          
        case 'shelf':
          if (item.scopeContext.shelfId === context.shelfId) {
            itemsInScope.push(item);
          }
          break;
          
        case 'book':
          if (item.scopeContext.shelfId === context.shelfId && 
              item.scopeContext.bookId === context.bookId) {
            itemsInScope.push(item);
          }
          break;
          
        case 'chapter':
          if (item.scopeContext.shelfId === context.shelfId && 
              item.scopeContext.bookId === context.bookId &&
              item.scopeContext.chapterId === context.chapterId) {
            itemsInScope.push(item);
          }
          break;
      }
    }
    
    return itemsInScope;
  }

  function reload() {
    value = JSON.parse(localStorage.getItem('repositories') || '{}');
    migrateExistingItems();
  }

  return {
    get value() {
      return value;
    },
    reset,
    add,
    remove,
    update,
    importRepositories,
    exportRepositories,
    getByCategory,
    getCategories,
    getForced,
    getMatchingKeywords,
    // New scoped methods
    getByScope,
    getByWorkbookTags,
    getItemsInScope,
    reload,
  };
}