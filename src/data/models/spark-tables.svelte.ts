import type { SparkTable, SparkTableList, SparkTableSettings } from "../types";

interface SparkTableUsageStats {
  [tableName: string]: {
    useCount: number;
    lastUsed: number;
    lastGeneratedKeywords: string[];
  };
}

export function createSparkTables() {
  let tables: SparkTableList = $state(JSON.parse(localStorage.getItem('spark-tables') || '{}'));
  let usageStats: SparkTableUsageStats = $state(JSON.parse(localStorage.getItem('spark-table-usage') || '{}'));
  let settings: SparkTableSettings = $state(JSON.parse(localStorage.getItem('spark-table-settings') || JSON.stringify({
    enabledTables: [],
    oracleTables: [],
    sparkTables: [],
    defaultTableEnabled: true,
    defaultTableCount: 2,
    keywordCount: 3,
    includeTableNames: false,
    allowCrossover: true
  })));

  // Initialize with default table if empty
  $effect(() => {
    if (Object.keys(tables).length === 0) {
      initializeWithDefaults();
    }
  });

  function initializeWithDefaults() {
    // Create the default table with common keywords
    const defaultKeywords = [
      'mysterious', 'ancient', 'forbidden', 'hidden', 'sacred', 'cursed',
      'powerful', 'dangerous', 'magical', 'divine', 'demonic', 'ethereal',
      'betrayal', 'alliance', 'secret', 'treasure', 'enemy', 'friend',
      'journey', 'quest', 'discovery', 'loss', 'victory', 'defeat',
      'dark', 'light', 'shadow', 'flame', 'storm', 'calm',
      'broken', 'whole', 'twisted', 'pure', 'corrupt', 'noble'
    ];

    const defaultTable: SparkTable = {
      name: 'default',
      source: 'built-in',
      entries: defaultKeywords,
      lastModified: Date.now(),
      enabled: true,
      weight: 1,
      oracleEnabled: true,
      sparksEnabled: true,
      categories: ['general'],
      isDefault: true
    };

    tables = { default: defaultTable };
    saveToStorage();
  }

  function saveToStorage() {
    localStorage.setItem('spark-tables', JSON.stringify(tables));
    localStorage.setItem('spark-table-usage', JSON.stringify(usageStats));
    localStorage.setItem('spark-table-settings', JSON.stringify(settings));
  }

  function getTables(): SparkTableList {
    return tables;
  }

  function getSettings(): SparkTableSettings {
    return settings;
  }

  function addTable(table: SparkTable): void {
    tables[table.name] = table;
    
    // Initialize usage stats
    if (!usageStats[table.name]) {
      usageStats[table.name] = {
        useCount: 0,
        lastUsed: 0,
        lastGeneratedKeywords: []
      };
    }
    
    saveToStorage();
  }

  function removeTable(tableName: string): void {
    if (tables[tableName] && !tables[tableName].isDefault) {
      delete tables[tableName];
      delete usageStats[tableName];
      saveToStorage();
    }
  }

  function updateTable(tableName: string, updates: Partial<SparkTable>): void {
    const table = tables[tableName];
    if (table) {
      Object.assign(table, updates);
      table.lastModified = Date.now();
      saveToStorage();
    }
  }

  function updateSettings(newSettings: SparkTableSettings): void {
    settings = { ...newSettings };
    saveToStorage();
  }

  function resetSettings(): void {
    settings = {
      enabledTables: [],
      oracleTables: [],
      sparkTables: [],
      defaultTableEnabled: true,
      defaultTableCount: 2,
      keywordCount: 3,
      includeTableNames: false,
      allowCrossover: true
    };
    saveToStorage();
  }

  function getEnabledTables(type: 'oracle' | 'sparks' | 'both' = 'both'): SparkTable[] {
    return Object.values(tables).filter(table => {
      if (!table.enabled && !table.isDefault) return false;
      if (table.isDefault && !settings.defaultTableEnabled) return false;
      
      switch (type) {
        case 'oracle':
          return table.oracleEnabled;
        case 'sparks':
          return table.sparksEnabled;
        case 'both':
          return table.oracleEnabled || table.sparksEnabled;
        default:
          return true;
      }
    });
  }

  function generateKeywords(count: number = 3, type: 'oracle' | 'sparks' = 'sparks', tableNames?: string[]): string[] {
    let availableTables: SparkTable[];

    if (tableNames && tableNames.length > 0) {
      // Use specific tables
      availableTables = tableNames
        .map(name => tables[name])
        .filter(table => table && table.enabled);
    } else {
      // Use all enabled tables for the type
      availableTables = getEnabledTables(type);
    }

    if (availableTables.length === 0) {
      // Fallback to default table
      const defaultTable = tables['default'];
      if (defaultTable) {
        availableTables = [defaultTable];
      } else {
        return [];
      }
    }

    // Create a weighted pool of all entries
    const weightedEntries: { keyword: string; table: string }[] = [];
    
    for (const table of availableTables) {
      const weight = table.weight || 1;
      for (let w = 0; w < weight; w++) {
        for (const entry of table.entries) {
          weightedEntries.push({ keyword: entry.toLowerCase(), table: table.name });
        }
      }
    }

    // Select random keywords
    const selected = new Set<string>();
    const keywords: string[] = [];

    while (keywords.length < count && weightedEntries.length > 0) {
      const randomIndex = Math.floor(Math.random() * weightedEntries.length);
      const { keyword, table } = weightedEntries[randomIndex];
      
      if (!selected.has(keyword)) {
        selected.add(keyword);
        keywords.push(keyword);
        
        // Record usage
        recordUsage(table, keyword);
      }
      
      // Remove this entry to avoid duplicates
      weightedEntries.splice(randomIndex, 1);
    }

    return keywords;
  }

  function recordUsage(tableName: string, keyword: string): void {
    if (!usageStats[tableName]) {
      usageStats[tableName] = {
        useCount: 0,
        lastUsed: 0,
        lastGeneratedKeywords: []
      };
    }
    
    const stats = usageStats[tableName];
    stats.useCount++;
    stats.lastUsed = Date.now();
    
    // Keep track of last generated keywords (up to 10)
    stats.lastGeneratedKeywords.unshift(keyword);
    if (stats.lastGeneratedKeywords.length > 10) {
      stats.lastGeneratedKeywords = stats.lastGeneratedKeywords.slice(0, 10);
    }
    
    saveToStorage();
  }

  function getUsageStats(tableName: string) {
    return usageStats[tableName] || {
      useCount: 0,
      lastUsed: 0,
      lastGeneratedKeywords: []
    };
  }

  async function importFromFile(file: File): Promise<{ success: boolean; tables?: SparkTable[]; error?: string }> {
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      
      if (lines.length < 2) {
        return { success: false, error: 'CSV must have at least a header and one data row' };
      }

      const tableName = lines[0].trim();
      const entries = lines.slice(1)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (entries.length === 0) {
        return { success: false, error: 'No valid keyword entries found' };
      }

      const table: SparkTable = {
        name: tableName || file.name.replace(/\.[^/.]+$/, ""),
        source: file.name,
        entries,
        lastModified: Date.now(),
        enabled: true,
        weight: 1,
        oracleEnabled: true,
        sparksEnabled: true,
        categories: [],
        isDefault: false
      };

      return { success: true, tables: [table] };
    } catch (error) {
      return {
        success: false,
        error: `File parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  function exportTables(): string {
    const exportData = {
      tables,
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  function importTables(jsonData: string): { success: boolean; imported?: number; errors?: string[] } {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.tables || typeof data.tables !== 'object') {
        return { success: false, errors: ['Invalid export format: missing tables'] };
      }

      let imported = 0;
      const errors: string[] = [];

      for (const [name, tableData] of Object.entries(data.tables)) {
        try {
          const table = tableData as SparkTable;
          if (table.name && Array.isArray(table.entries) && table.entries.length > 0) {
            addTable(table);
            imported++;
          } else {
            errors.push(`Invalid table data for "${name}"`);
          }
        } catch (error) {
          errors.push(`Failed to import table "${name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import settings if available
      if (data.settings) {
        try {
          updateSettings(data.settings);
        } catch (error) {
          errors.push(`Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { success: imported > 0, imported, errors };
    } catch (error) {
      return {
        success: false,
        errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  function reset(): void {
    tables = {};
    usageStats = {};
    resetSettings();
    initializeWithDefaults();
  }

  function getTableStats(): { [tableName: string]: { entryCount: number; lastModified: number; useCount: number } } {
    const stats: { [tableName: string]: { entryCount: number; lastModified: number; useCount: number } } = {};
    
    for (const [name, table] of Object.entries(tables)) {
      const usage = getUsageStats(name);
      stats[name] = {
        entryCount: table.entries.length,
        lastModified: table.lastModified,
        useCount: usage.useCount
      };
    }
    
    return stats;
  }

  return {
    // State
    get tables() { return tables; },
    get settings() { return settings; },
    get usageStats() { return usageStats; },
    
    // Methods
    getTables,
    getSettings,
    addTable,
    removeTable,
    updateTable,
    updateSettings,
    resetSettings,
    getEnabledTables,
    generateKeywords,
    recordUsage,
    getUsageStats,
    importFromFile,
    exportTables,
    importTables,
    reset,
    getTableStats,
    
    // Computed
    get enabledTableCount() {
      return getEnabledTables('both').length;
    },
    
    get totalKeywords() {
      return Object.values(tables).reduce((sum, table) => sum + table.entries.length, 0);
    }
  };
}