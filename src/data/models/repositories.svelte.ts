import type { RepositoryItem, RepositoryList, RepositoryCategory } from "../types";

export function createRepositories() {
  let value = $state(JSON.parse(localStorage.getItem('repositories') || '{}'));

  function reset() {
    value = {};
    localStorage.setItem('repositories', JSON.stringify(value));
  }

  function add(item: RepositoryItem) {
    const timestamp = Date.now();
    item.created = item.created || timestamp;
    item.updated = timestamp;
    
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
      value[key] = item;
      localStorage.setItem('repositories', JSON.stringify(value));
    }
  }

  function importRepositories(repositories: RepositoryList) {
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

  function reload() {
    value = JSON.parse(localStorage.getItem('repositories') || '{}');
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
    reload,
  };
}