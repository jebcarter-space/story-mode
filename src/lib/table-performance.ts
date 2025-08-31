import type { 
  RandomTable, 
  CacheEntry, 
  PerformanceMetrics, 
  TableIndexData,
  TableResult,
  RollContext
} from '../data/types';

/**
 * Performance optimization utilities for enhanced table system
 */
export class TablePerformanceOptimizer {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 1000;

  private tableCache = new Map<string, CacheEntry<RandomTable>>();
  private resultCache = new Map<string, CacheEntry<TableResult>>();
  private indexCache = new Map<string, CacheEntry<TableIndexData>>();
  private performanceMetrics: PerformanceMetrics = {
    rollTime: 0,
    evaluationTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    tableLoads: 0,
  };

  /**
   * Get cached table if available and valid
   */
  getCachedTable(tableName: string): RandomTable | null {
    const entry = this.tableCache.get(tableName);
    if (entry && this.isCacheValid(entry)) {
      entry.hits++;
      this.performanceMetrics.cacheHits++;
      return entry.data;
    }
    
    if (entry) {
      this.tableCache.delete(tableName);
    }
    this.performanceMetrics.cacheMisses++;
    return null;
  }

  /**
   * Cache a table
   */
  cacheTable(tableName: string, table: RandomTable): void {
    this.ensureCacheSize(this.tableCache);
    this.tableCache.set(tableName, {
      data: table,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Get cached result if available
   */
  getCachedResult(cacheKey: string): TableResult | null {
    const entry = this.resultCache.get(cacheKey);
    if (entry && this.isCacheValid(entry)) {
      entry.hits++;
      this.performanceMetrics.cacheHits++;
      return entry.data;
    }
    
    if (entry) {
      this.resultCache.delete(cacheKey);
    }
    this.performanceMetrics.cacheMisses++;
    return null;
  }

  /**
   * Cache a table result
   */
  cacheResult(cacheKey: string, result: TableResult): void {
    this.ensureCacheSize(this.resultCache);
    this.resultCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Generate a cache key for a table roll
   */
  generateCacheKey(tableName: string, context: RollContext): string {
    // Include relevant context variables that affect the result
    const contextStr = JSON.stringify({
      variables: context.variables,
      storyId: context.storyId,
      // Don't include previousResults as they make caching less effective
    });
    return `${tableName}:${this.hashString(contextStr)}`;
  }

  /**
   * Build index for a table to enable fast searching
   */
  buildTableIndex(table: RandomTable): TableIndexData {
    const cached = this.indexCache.get(table.name);
    if (cached && this.isCacheValid(cached)) {
      cached.hits++;
      return cached.data;
    }

    const indexData: TableIndexData = {
      tagIndex: new Map(),
      categoryIndex: new Map(),
      rarityIndex: new Map(),
      fullTextIndex: new Map(),
      lastIndexed: Date.now(),
    };

    table.table.forEach((entry, index) => {
      const description = typeof entry.description === 'string' 
        ? entry.description 
        : entry.description().toString();

      // Index full text
      this.addToIndex(indexData.fullTextIndex, description.toLowerCase(), index);

      // Index metadata if available
      if (entry.metadata) {
        // Index tags
        entry.metadata.tags?.forEach(tag => {
          this.addToIndex(indexData.tagIndex, tag.toLowerCase(), index);
        });

        // Index category
        if (entry.metadata.category) {
          this.addToIndex(indexData.categoryIndex, entry.metadata.category.toLowerCase(), index);
        }

        // Index rarity
        if (entry.metadata.rarity) {
          this.addToIndex(indexData.rarityIndex, entry.metadata.rarity, index);
        }
      }
    });

    // Cache the index
    this.ensureCacheSize(this.indexCache);
    this.indexCache.set(table.name, {
      data: indexData,
      timestamp: Date.now(),
      hits: 0,
    });

    return indexData;
  }

  /**
   * Search table entries using index
   */
  searchTableEntries(
    table: RandomTable, 
    query: string, 
    filters?: {
      tags?: string[];
      category?: string;
      rarity?: string;
    }
  ): number[] {
    const index = this.buildTableIndex(table);
    const matchingIndices = new Set<number>();

    // Search full text
    if (query) {
      const queryLower = query.toLowerCase();
      for (const [text, indices] of index.fullTextIndex) {
        if (text.includes(queryLower)) {
          indices.forEach(idx => matchingIndices.add(idx));
        }
      }
    }

    // Apply filters
    if (filters) {
      const filterResults = new Set<number>();
      let hasFilters = false;

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        hasFilters = true;
        filters.tags.forEach(tag => {
          const indices = index.tagIndex.get(tag.toLowerCase());
          if (indices) {
            indices.forEach(idx => filterResults.add(idx));
          }
        });
      }

      // Filter by category
      if (filters.category) {
        hasFilters = true;
        const indices = index.categoryIndex.get(filters.category.toLowerCase());
        if (indices) {
          indices.forEach(idx => filterResults.add(idx));
        }
      }

      // Filter by rarity
      if (filters.rarity) {
        hasFilters = true;
        const indices = index.rarityIndex.get(filters.rarity);
        if (indices) {
          indices.forEach(idx => filterResults.add(idx));
        }
      }

      // If we have both query and filters, intersect the results
      if (hasFilters) {
        if (query && matchingIndices.size > 0) {
          // Intersect query results with filter results
          const intersection = new Set<number>();
          for (const idx of matchingIndices) {
            if (filterResults.has(idx)) {
              intersection.add(idx);
            }
          }
          return Array.from(intersection);
        } else {
          return Array.from(filterResults);
        }
      }
    }

    return Array.from(matchingIndices);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      rollTime: 0,
      evaluationTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      tableLoads: 0,
    };
  }

  /**
   * Record timing for an operation
   */
  recordTiming(operation: keyof PerformanceMetrics, duration: number): void {
    if (operation === 'cacheHits' || operation === 'cacheMisses' || operation === 'tableLoads') {
      this.performanceMetrics[operation]++;
    } else {
      this.performanceMetrics[operation] += duration;
    }
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.tableCache.clear();
    this.resultCache.clear();
    this.indexCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    tableCache: { size: number; hitRate: number };
    resultCache: { size: number; hitRate: number };
    indexCache: { size: number; hitRate: number };
  } {
    return {
      tableCache: this.getCacheStatsForCache(this.tableCache),
      resultCache: this.getCacheStatsForCache(this.resultCache),
      indexCache: this.getCacheStatsForCache(this.indexCache),
    };
  }

  /**
   * Preload frequently used tables
   */
  async preloadTables(tables: RandomTable[]): Promise<void> {
    const promises = tables.map(async table => {
      this.cacheTable(table.name, table);
      // Build index asynchronously
      return new Promise<void>(resolve => {
        setTimeout(() => {
          this.buildTableIndex(table);
          resolve();
        }, 0);
      });
    });

    await Promise.all(promises);
  }

  // Private helper methods

  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;
    const ttl = entry.ttl || TablePerformanceOptimizer.CACHE_TTL;
    return age < ttl;
  }

  private ensureCacheSize<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size >= TablePerformanceOptimizer.MAX_CACHE_SIZE) {
      // Remove least recently used items (based on hits and timestamp)
      const entries = Array.from(cache.entries());
      entries.sort(([, a], [, b]) => {
        // Sort by hits (ascending) then by age (descending)
        if (a.hits !== b.hits) {
          return a.hits - b.hits;
        }
        return b.timestamp - a.timestamp;
      });

      // Remove bottom 25%
      const removeCount = Math.floor(cache.size * 0.25);
      for (let i = 0; i < removeCount; i++) {
        cache.delete(entries[i][0]);
      }
    }
  }

  private addToIndex(index: Map<string, Set<number>>, key: string, entryIndex: number): void {
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key)!.add(entryIndex);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private getCacheStatsForCache<T>(cache: Map<string, CacheEntry<T>>): { size: number; hitRate: number } {
    let totalHits = 0;
    let totalAccess = 0;

    cache.forEach(entry => {
      totalHits += entry.hits;
      totalAccess += entry.hits; // Each hit represents an access
    });

    // Include misses in total access (approximate)
    totalAccess += this.performanceMetrics.cacheMisses;

    return {
      size: cache.size,
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
    };
  }
}