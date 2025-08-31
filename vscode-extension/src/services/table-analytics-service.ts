import * as vscode from 'vscode';

/**
 * Service for tracking table usage analytics
 */
export class TableAnalyticsService {
  private static readonly USAGE_STORAGE_KEY = 'storyMode.tableUsage';
  private usageData: { [tableName: string]: TableUsageStats } = {};

  constructor(private context: vscode.ExtensionContext) {
    this.loadUsageData();
  }

  /**
   * Record table usage for analytics
   */
  recordUsage(tableName: string, context: 'oracle' | 'sparks', keywords: string[]): void {
    const now = Date.now();
    
    if (!this.usageData[tableName]) {
      this.usageData[tableName] = {
        totalUses: 0,
        lastUsed: now,
        firstUsed: now,
        oracleUses: 0,
        sparksUses: 0,
        keywordsGenerated: [],
        averageKeywordsPerUse: 0,
        daysSinceLastUse: 0
      };
    }

    const stats = this.usageData[tableName];
    stats.totalUses++;
    stats.lastUsed = now;
    stats.keywordsGenerated.push(...keywords);
    
    if (context === 'oracle') {
      stats.oracleUses++;
    } else {
      stats.sparksUses++;
    }

    stats.averageKeywordsPerUse = stats.keywordsGenerated.length / stats.totalUses;
    stats.daysSinceLastUse = Math.floor((now - stats.lastUsed) / (1000 * 60 * 60 * 24));

    this.saveUsageData();
  }

  /**
   * Get usage statistics for a table
   */
  getTableStats(tableName: string): TableUsageStats | null {
    return this.usageData[tableName] || null;
  }

  /**
   * Get all usage statistics
   */
  getAllStats(): { [tableName: string]: TableUsageStats } {
    return { ...this.usageData };
  }

  /**
   * Get usage statistics enriched with computed values
   */
  getEnrichedStats(tableName: string): EnrichedTableStats | null {
    const stats = this.usageData[tableName];
    if (!stats) return null;

    const now = Date.now();
    const daysSinceLastUse = Math.floor((now - stats.lastUsed) / (1000 * 60 * 60 * 24));
    const daysSinceFirstUse = Math.floor((now - stats.firstUsed) / (1000 * 60 * 60 * 24));
    const usesPerDay = daysSinceFirstUse > 0 ? stats.totalUses / daysSinceFirstUse : stats.totalUses;

    return {
      ...stats,
      daysSinceLastUse,
      daysSinceFirstUse,
      usesPerDay,
      mostRecentKeywords: stats.keywordsGenerated.slice(-10),
      preferredContext: stats.oracleUses > stats.sparksUses ? 'oracle' : 'sparks'
    };
  }

  /**
   * Get top performing tables
   */
  getTopTables(limit: number = 5): Array<{ name: string; stats: EnrichedTableStats }> {
    return Object.entries(this.usageData)
      .map(([name, stats]) => ({ name, stats: this.getEnrichedStats(name)! }))
      .filter(item => item.stats)
      .sort((a, b) => b.stats.totalUses - a.stats.totalUses)
      .slice(0, limit);
  }

  /**
   * Reset usage statistics for a table
   */
  resetTableStats(tableName: string): void {
    delete this.usageData[tableName];
    this.saveUsageData();
  }

  /**
   * Reset all usage statistics
   */
  resetAllStats(): void {
    this.usageData = {};
    this.saveUsageData();
  }

  /**
   * Load usage data from storage
   */
  private loadUsageData(): void {
    try {
      const stored = this.context.globalState.get<string>(TableAnalyticsService.USAGE_STORAGE_KEY);
      if (stored) {
        this.usageData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load table usage data:', error);
      this.usageData = {};
    }
  }

  /**
   * Save usage data to storage
   */
  private saveUsageData(): void {
    try {
      this.context.globalState.update(
        TableAnalyticsService.USAGE_STORAGE_KEY,
        JSON.stringify(this.usageData)
      );
    } catch (error) {
      console.error('Failed to save table usage data:', error);
    }
  }
}

/**
 * Basic table usage statistics
 */
export interface TableUsageStats {
  totalUses: number;
  lastUsed: number;
  firstUsed: number;
  oracleUses: number;
  sparksUses: number;
  keywordsGenerated: string[];
  averageKeywordsPerUse: number;
  daysSinceLastUse: number;
}

/**
 * Enhanced table usage statistics with computed values
 */
export interface EnrichedTableStats extends TableUsageStats {
  daysSinceFirstUse: number;
  usesPerDay: number;
  mostRecentKeywords: string[];
  preferredContext: 'oracle' | 'sparks';
}