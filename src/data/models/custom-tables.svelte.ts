import type { CustomTableList, RandomTable } from "../types";

interface TableUsageStats {
  [tableName: string]: {
    useCount: number;
    lastUsed: number;
  };
}

export function createCustomTables() {
  let value: CustomTableList = $state(JSON.parse(localStorage.getItem('tables') || '{}'));
  let usageStats: TableUsageStats = $state(JSON.parse(localStorage.getItem('table-usage') || '{}'));

  function saveToStorage() {
    localStorage.setItem('tables', JSON.stringify(value));
    localStorage.setItem('table-usage', JSON.stringify(usageStats));
  }

  function reset() {
    value = {};
    usageStats = {};
    saveToStorage();
  }

  function add(data: RandomTable | RandomTable[]) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    for (const item of data) {
      value[item.name] = item;
      // Initialize usage stats if not present
      if (!usageStats[item.name]) {
        usageStats[item.name] = { useCount: 0, lastUsed: 0 };
      }
    }
    saveToStorage();
  }

  function remove(key: string) {
    delete value[key];
    delete usageStats[key];
    saveToStorage();
  }

  function removeMultiple(keys: string[]) {
    keys.forEach(key => {
      delete value[key];
      delete usageStats[key];
    });
    saveToStorage();
  }

  function duplicate(tableName: string, newName?: string): boolean {
    const original = value[tableName];
    if (!original) return false;

    const duplicateName = newName || `${tableName} (Copy)`;
    
    // Ensure unique name
    let finalName = duplicateName;
    let counter = 1;
    while (value[finalName]) {
      finalName = `${duplicateName} ${counter}`;
      counter++;
    }

    const duplicatedTable: RandomTable = {
      ...original,
      name: finalName,
      table: [...original.table] // Deep copy the table array
    };

    add(duplicatedTable);
    return true;
  }

  function search(query: string): CustomTableList {
    if (!query.trim()) return value;

    const filtered: CustomTableList = {};
    const lowerQuery = query.toLowerCase();

    Object.entries(value).forEach(([key, table]) => {
      // Search in name, description, and table entries
      const searchText = `${table.name} ${table.description} ${table.table.map(row => row.description).join(' ')}`.toLowerCase();
      
      if (searchText.includes(lowerQuery)) {
        filtered[key] = table;
      }
    });

    return filtered;
  }

  function filterByUsage(sortBy: 'mostUsed' | 'leastUsed' | 'recentlyUsed' | 'neverUsed'): CustomTableList {
    const filtered: CustomTableList = {};
    const entries = Object.entries(value);

    let sorted: [string, RandomTable][];

    switch (sortBy) {
      case 'mostUsed':
        sorted = entries.sort(([a], [b]) => 
          (usageStats[b]?.useCount || 0) - (usageStats[a]?.useCount || 0)
        );
        break;
      case 'leastUsed':
        sorted = entries.sort(([a], [b]) => 
          (usageStats[a]?.useCount || 0) - (usageStats[b]?.useCount || 0)
        );
        break;
      case 'recentlyUsed':
        sorted = entries.sort(([a], [b]) => 
          (usageStats[b]?.lastUsed || 0) - (usageStats[a]?.lastUsed || 0)
        );
        break;
      case 'neverUsed':
        sorted = entries.filter(([key]) => !usageStats[key] || usageStats[key].useCount === 0);
        break;
      default:
        sorted = entries;
    }

    sorted.forEach(([key, table]) => {
      filtered[key] = table;
    });

    return filtered;
  }

  function recordUsage(tableName: string) {
    if (!usageStats[tableName]) {
      usageStats[tableName] = { useCount: 0, lastUsed: 0 };
    }
    usageStats[tableName].useCount++;
    usageStats[tableName].lastUsed = Date.now();
    saveToStorage();
  }

  function getUsageStats(tableName: string) {
    return usageStats[tableName] || { useCount: 0, lastUsed: 0 };
  }

  function getAllUsageStats() {
    return usageStats;
  }

  function validateTable(table: RandomTable): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!table.name?.trim()) {
      errors.push('Table name is required');
    }

    if (!table.description?.trim()) {
      warnings.push('Table description is missing');
    }

    if (!table.diceFormula?.trim()) {
      errors.push('Dice formula is required');
    } else {
      // Basic dice formula validation (simple regex)
      const diceRegex = /^\d*d\d+([+-]\d+)?$/i;
      if (!diceRegex.test(table.diceFormula)) {
        warnings.push('Dice formula may not be valid (expected format: 1d6, 2d8+1, etc.)');
      }
    }

    if (!table.table || !Array.isArray(table.table)) {
      errors.push('Table must have a table array');
    } else if (table.table.length === 0) {
      errors.push('Table must have at least one row');
    } else {
      // Validate table rows
      const hasValidRows = table.table.some(row => 
        row.description && row.description.toString().trim()
      );

      if (!hasValidRows) {
        errors.push('Table must have at least one row with a description');
      }

      table.table.forEach((row, index) => {
        if (!row.description || !row.description.toString().trim()) {
          warnings.push(`Row ${index + 1}: Empty description`);
        }

        if (row.min === null && row.max === null) {
          warnings.push(`Row ${index + 1}: No min/max values specified`);
        }
      });
    }

    // Check for duplicate name
    if (table.name && value[table.name]) {
      warnings.push('A table with this name already exists and will be replaced');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  function importFromBackup(backupData: any): { success: boolean; imported: number; errors: string[] } {
    try {
      let imported = 0;
      const errors: string[] = [];

      // Handle different backup formats
      let tables: RandomTable[] = [];

      if (backupData.tables && typeof backupData.tables === 'object') {
        // New backup format with metadata
        tables = Object.values(backupData.tables) as RandomTable[];
      } else if (Array.isArray(backupData)) {
        // Array of tables
        tables = backupData;
      } else if (backupData.name && backupData.table) {
        // Single table
        tables = [backupData];
      } else {
        return { success: false, imported: 0, errors: ['Invalid backup format'] };
      }

      for (const table of tables) {
        const validation = validateTable(table);
        if (validation.isValid) {
          add(table);
          imported++;
        } else {
          errors.push(`Table "${table.name || 'Unknown'}": ${validation.errors.join(', ')}`);
        }
      }

      return { success: imported > 0, imported, errors };
    } catch (error) {
      return { 
        success: false, 
        imported: 0, 
        errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  return {
    get value() {
      return value;
    },
    get stats() {
      return usageStats;
    },
    reset,
    add,
    remove,
    removeMultiple,
    duplicate,
    search,
    filterByUsage,
    recordUsage,
    getUsageStats,
    getAllUsageStats,
    validateTable,
    importFromBackup,
  }
};