import * as vscode from 'vscode';
import type { RepositoryItem, Template } from '../types';

export class PerformanceService {
  private itemCache = new Map<string, CacheEntry<RepositoryItem>>();
  private templateCache = new Map<string, CacheEntry<Template>>();
  private contextCache = new Map<string, CacheEntry<any>>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private context: vscode.ExtensionContext) {
    // Clean up cache periodically
    setInterval(() => this.cleanupCache(), 60 * 1000); // Every minute
    
    // Monitor memory usage
    this.monitorMemoryUsage();
  }

  /**
   * Cache repository items with TTL
   */
  cacheRepositoryItems(items: RepositoryItem[]): void {
    const now = Date.now();
    items.forEach(item => {
      const key = `repo:${item.category}:${item.name}`;
      this.itemCache.set(key, {
        data: item,
        timestamp: now,
        hits: 0
      });
    });
  }

  /**
   * Get cached repository item
   */
  getCachedRepositoryItem(category: string, name: string): RepositoryItem | null {
    const key = `repo:${category}:${name}`;
    const entry = this.itemCache.get(key);
    
    if (entry && this.isCacheValid(entry)) {
      entry.hits++;
      return entry.data;
    }
    
    return null;
  }

  /**
   * Cache templates with TTL
   */
  cacheTemplates(templates: { [key: string]: Template }): void {
    const now = Date.now();
    Object.entries(templates).forEach(([key, template]) => {
      this.templateCache.set(key, {
        data: template,
        timestamp: now,
        hits: 0
      });
    });
  }

  /**
   * Get cached template
   */
  getCachedTemplate(key: string): Template | null {
    const entry = this.templateCache.get(key);
    
    if (entry && this.isCacheValid(entry)) {
      entry.hits++;
      return entry.data;
    }
    
    return null;
  }

  /**
   * Cache context resolution results
   */
  cacheContext(key: string, data: any): void {
    this.contextCache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Get cached context
   */
  getCachedContext(key: string): any | null {
    const entry = this.contextCache.get(key);
    
    if (entry && this.isCacheValid(entry)) {
      entry.hits++;
      return entry.data;
    }
    
    return null;
  }

  /**
   * Preload frequently used items
   */
  async preloadFrequentItems(): Promise<void> {
    // Find most frequently accessed items
    const frequentItems = Array.from(this.itemCache.entries())
      .filter(([, entry]) => entry.hits > 5)
      .sort(([, a], [, b]) => b.hits - a.hits)
      .slice(0, 20);

    // Keep these in cache longer by refreshing their timestamps
    const now = Date.now();
    frequentItems.forEach(([key, entry]) => {
      entry.timestamp = now;
    });
  }

  /**
   * Batch process repository operations
   */
  async batchProcessRepositoryUpdates(updates: RepositoryUpdateBatch[]): Promise<void> {
    // Group updates by category for efficient processing
    const grouped = new Map<string, RepositoryUpdateBatch[]>();
    
    updates.forEach(update => {
      const category = update.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(update);
    });

    // Process each category in parallel
    const promises = Array.from(grouped.entries()).map(([category, categoryUpdates]) =>
      this.processCategoryUpdates(category, categoryUpdates)
    );

    await Promise.all(promises);
  }

  /**
   * Optimize context for LLM requests
   */
  optimizeContextForLLM(text: string, maxTokens: number): OptimizedContext {
    const cacheKey = `context:${text.substring(0, 100)}:${maxTokens}`;
    const cached = this.getCachedContext(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Estimate tokens (4 chars ≈ 1 token)
    const maxChars = maxTokens * 4;
    
    let optimized: OptimizedContext;
    
    if (text.length <= maxChars) {
      optimized = {
        text,
        truncated: false,
        preservedSections: []
      };
    } else {
      optimized = this.intelligentTruncation(text, maxChars);
    }

    this.cacheContext(cacheKey, optimized);
    return optimized;
  }

  private intelligentTruncation(text: string, maxChars: number): OptimizedContext {
    const sections: TextSection[] = [];
    
    // Identify important sections
    const dialogueSections = this.findDialogueSections(text);
    const actionSections = this.findActionSections(text);
    
    // Prioritize recent content and important sections
    const recentChars = Math.floor(maxChars * 0.7);
    const importantChars = maxChars - recentChars;
    
    let result = text.slice(-recentChars);
    const preserved: string[] = [];
    
    // Add important sections if there's space
    let remainingChars = importantChars;
    
    for (const section of [...dialogueSections, ...actionSections]) {
      if (section.text.length <= remainingChars && !result.includes(section.text)) {
        preserved.push(section.text);
        remainingChars -= section.text.length;
      }
    }
    
    if (preserved.length > 0) {
      result = preserved.join('\n\n') + '\n\n' + result;
    }

    return {
      text: result,
      truncated: true,
      preservedSections: preserved
    };
  }

  private findDialogueSections(text: string): TextSection[] {
    const sections: TextSection[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('"') || line.includes("'") || line.includes('"')) {
        sections.push({
          text: line,
          type: 'dialogue',
          importance: 3,
          start: i,
          end: i
        });
      }
    }
    
    return sections;
  }

  private findActionSections(text: string): TextSection[] {
    const sections: TextSection[] = [];
    const actionWords = /\b(attacks?|moves?|runs?|walks?|jumps?|fights?|casts?|throws?)\b/gi;
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (actionWords.test(line)) {
        sections.push({
          text: line,
          type: 'action',
          importance: 2,
          start: i,
          end: i
        });
      }
    }
    
    return sections;
  }

  private processCategoryUpdates(category: string, updates: RepositoryUpdateBatch[]): Promise<void> {
    // Process updates for a single category
    return Promise.resolve(); // Placeholder implementation
  }

  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return (Date.now() - entry.timestamp) < PerformanceService.CACHE_TTL;
  }

  private cleanupCache(): void {
    const now = Date.now();
    
    // Clean item cache
    for (const [key, entry] of this.itemCache.entries()) {
      if ((now - entry.timestamp) > PerformanceService.CACHE_TTL) {
        this.itemCache.delete(key);
      }
    }
    
    // Clean template cache
    for (const [key, entry] of this.templateCache.entries()) {
      if ((now - entry.timestamp) > PerformanceService.CACHE_TTL) {
        this.templateCache.delete(key);
      }
    }
    
    // Clean context cache
    for (const [key, entry] of this.contextCache.entries()) {
      if ((now - entry.timestamp) > PerformanceService.CACHE_TTL) {
        this.contextCache.delete(key);
      }
    }
  }

  private monitorMemoryUsage(): void {
    const checkMemory = () => {
      const totalCacheSize = this.itemCache.size + this.templateCache.size + this.contextCache.size;
      
      // If cache is getting too large, clear least recently used items
      if (totalCacheSize > 1000) {
        this.clearLeastRecentlyUsed();
      }
    };
    
    // Check every 5 minutes
    setInterval(checkMemory, 5 * 60 * 1000);
  }

  private clearLeastRecentlyUsed(): void {
    const allEntries: Array<{ key: string, entry: CacheEntry<any>, cache: Map<string, CacheEntry<any>> }> = [];
    
    // Collect all cache entries
    this.itemCache.forEach((entry, key) => {
      allEntries.push({ key, entry, cache: this.itemCache });
    });
    
    this.templateCache.forEach((entry, key) => {
      allEntries.push({ key, entry, cache: this.templateCache });
    });
    
    this.contextCache.forEach((entry, key) => {
      allEntries.push({ key, entry, cache: this.contextCache });
    });
    
    // Sort by hits (ascending) and timestamp (ascending)
    allEntries.sort((a, b) => {
      if (a.entry.hits !== b.entry.hits) {
        return a.entry.hits - b.entry.hits;
      }
      return a.entry.timestamp - b.entry.timestamp;
    });
    
    // Remove bottom 25%
    const toRemove = Math.floor(allEntries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const { key, cache } = allEntries[i];
      cache.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      items: this.itemCache.size,
      templates: this.templateCache.size,
      contexts: this.contextCache.size,
      totalMemoryEstimate: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    let estimate = 0;
    
    // Rough estimate based on cache sizes
    estimate += this.itemCache.size * 1024; // ~1KB per item
    estimate += this.templateCache.size * 2048; // ~2KB per template
    estimate += this.contextCache.size * 512; // ~512B per context
    
    return estimate;
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface OptimizedContext {
  text: string;
  truncated: boolean;
  preservedSections: string[];
}

interface TextSection {
  text: string;
  type: 'dialogue' | 'action' | 'description';
  importance: number;
  start: number;
  end: number;
}

interface RepositoryUpdateBatch {
  type: 'create' | 'update' | 'delete';
  category: string;
  name: string;
  data?: any;
}

interface CacheStats {
  items: number;
  templates: number;
  contexts: number;
  totalMemoryEstimate: number;
}