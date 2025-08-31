import type { 
  RandomTable, 
  TableValidationResult, 
  TableRelationship,
  AdvancedRollOptions,
  TableResult,
  RollContext,
  CustomTableList 
} from "../types";
import { AdvancedTableRoller } from "../../lib/advanced-table-engine";

/**
 * Enhanced table management with advanced features
 */
export function createEnhancedTables() {
  let tables: CustomTableList = $state({});
  let advancedTableRoller = $state(new AdvancedTableRoller());
  
  // Load from storage
  function loadFromStorage() {
    const stored = localStorage.getItem('enhanced-tables');
    if (stored) {
      try {
        tables = JSON.parse(stored);
        // Update the roller with the new tables
        advancedTableRoller = new AdvancedTableRoller(tables, {});
      } catch (error) {
        console.error('Failed to load enhanced tables:', error);
      }
    }
  }

  // Save to storage
  function saveToStorage() {
    localStorage.setItem('enhanced-tables', JSON.stringify(tables));
  }

  // Initialize
  loadFromStorage();

  /**
   * Add or update a table with enhanced features
   */
  function addTable(table: RandomTable) {
    // Mark as enhanced if it has advanced features
    if (hasAdvancedFeatures(table)) {
      table.enhanced = true;
    }

    tables[table.name] = table;
    advancedTableRoller = new AdvancedTableRoller(tables, {});
    saveToStorage();
  }

  /**
   * Remove a table
   */
  function removeTable(tableName: string) {
    delete tables[tableName];
    advancedTableRoller = new AdvancedTableRoller(tables, {});
    saveToStorage();
  }

  /**
   * Get a table by name
   */
  function getTable(tableName: string): RandomTable | null {
    return tables[tableName] || null;
  }

  /**
   * Validate an enhanced table
   */
  function validateEnhancedTable(table: RandomTable): TableValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (!table.name?.trim()) {
      errors.push('Table name is required');
    }
    
    if (!table.diceFormula?.trim()) {
      errors.push('Dice formula is required');
    }
    
    if (!table.table || table.table.length === 0) {
      errors.push('Table must have at least one entry');
    }

    // Enhanced features validation
    const enhancedFeatures = {
      hasConditionals: false,
      hasRelationships: false,
      hasWeighting: false,
      hasMetadata: false,
    };

    // Validate relationships
    if (table.relationships) {
      enhancedFeatures.hasRelationships = true;
      const relationshipErrors = validateRelationships(table.relationships);
      errors.push(...relationshipErrors);
    }

    // Validate table entries with modifiers
    table.table.forEach((entry, index) => {
      if (entry.modifiers) {
        entry.modifiers.forEach(modifier => {
          switch (modifier.type) {
            case 'conditional':
              enhancedFeatures.hasConditionals = true;
              if (modifier.condition) {
                const validation = validateCondition(modifier.condition);
                if (!validation.isValid) {
                  errors.push(`Entry ${index + 1}: Invalid condition - ${validation.error}`);
                }
              }
              break;
            
            case 'weighted':
              enhancedFeatures.hasWeighting = true;
              if (modifier.weight !== undefined && modifier.weight < 0) {
                errors.push(`Entry ${index + 1}: Weight must be non-negative`);
              }
              break;
            
            case 'linked':
              if (!modifier.dependency) {
                errors.push(`Entry ${index + 1}: Linked modifier requires dependency`);
              }
              break;
          }
        });
      }

      if (entry.metadata) {
        enhancedFeatures.hasMetadata = true;
      }
    });

    // Validate default roll options
    if (table.defaultRollOptions) {
      const optionErrors = validateRollOptions(table.defaultRollOptions);
      errors.push(...optionErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      enhancedFeatures,
    };
  }

  /**
   * Roll on an enhanced table
   */
  async function rollOnEnhancedTable(
    tableName: string, 
    context: RollContext,
    rollOptions?: AdvancedRollOptions
  ): Promise<TableResult | null> {
    const table = getTable(tableName);
    if (!table) {
      console.error(`Table '${tableName}' not found`);
      return null;
    }

    try {
      return await advancedTableRoller.rollWithModifiers(table, context, rollOptions);
    } catch (error) {
      console.error(`Failed to roll on enhanced table '${tableName}':`, error);
      return null;
    }
  }

  /**
   * Add a relationship to a table
   */
  function addRelationship(tableName: string, relationship: TableRelationship) {
    const table = getTable(tableName);
    if (!table) {
      throw new Error(`Table '${tableName}' not found`);
    }

    if (!table.relationships) {
      table.relationships = [];
    }

    table.relationships.push(relationship);
    table.enhanced = true;
    
    tables[tableName] = table;
    advancedTableRoller = new AdvancedTableRoller(tables, {});
    saveToStorage();
  }

  /**
   * Remove a relationship from a table
   */
  function removeRelationship(tableName: string, targetTable: string) {
    const table = getTable(tableName);
    if (!table || !table.relationships) {
      return;
    }

    table.relationships = table.relationships.filter(rel => rel.targetTable !== targetTable);
    
    if (table.relationships.length === 0 && !hasOtherAdvancedFeatures(table)) {
      table.enhanced = false;
    }

    tables[tableName] = table;
    advancedTableRoller = new AdvancedTableRoller(tables, {});
    saveToStorage();
  }

  /**
   * Get enhanced tables statistics
   */
  function getEnhancedStats() {
    const stats = {
      totalTables: Object.keys(tables).length,
      enhancedTables: 0,
      tablesWithConditionals: 0,
      tablesWithRelationships: 0,
      tablesWithWeighting: 0,
      tablesWithMetadata: 0,
      totalRelationships: 0,
    };

    Object.values(tables).forEach(table => {
      if (table.enhanced) {
        stats.enhancedTables++;
      }

      if (table.relationships) {
        stats.tablesWithRelationships++;
        stats.totalRelationships += table.relationships.length;
      }

      table.table.forEach(entry => {
        if (entry.modifiers) {
          const hasConditional = entry.modifiers.some(m => m.type === 'conditional');
          const hasWeighting = entry.modifiers.some(m => m.type === 'weighted');
          
          if (hasConditional) stats.tablesWithConditionals++;
          if (hasWeighting) stats.tablesWithWeighting++;
        }

        if (entry.metadata) {
          stats.tablesWithMetadata++;
        }
      });
    });

    return stats;
  }

  /**
   * Export enhanced tables
   */
  function exportEnhancedTables(): string {
    return JSON.stringify({
      version: '1.0',
      tables,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import enhanced tables
   */
  function importEnhancedTables(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const data = JSON.parse(jsonData);
      let imported = 0;
      const errors: string[] = [];

      // Handle different import formats
      let tablesToImport: RandomTable[] = [];
      
      if (data.tables && typeof data.tables === 'object') {
        tablesToImport = Object.values(data.tables);
      } else if (Array.isArray(data)) {
        tablesToImport = data;
      } else if (data.name) {
        tablesToImport = [data];
      }

      for (const table of tablesToImport) {
        const validation = validateEnhancedTable(table);
        if (validation.isValid) {
          addTable(table);
          imported++;
        } else {
          errors.push(`Table '${table.name}': ${validation.errors.join(', ')}`);
        }
      }

      return { success: imported > 0, imported, errors };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get performance metrics from the roller
   */
  function getPerformanceMetrics() {
    return advancedTableRoller.getPerformanceMetrics();
  }

  // Helper functions

  function hasAdvancedFeatures(table: RandomTable): boolean {
    return !!(
      table.relationships?.length ||
      table.defaultRollOptions ||
      table.table.some(entry => entry.modifiers || entry.metadata)
    );
  }

  function hasOtherAdvancedFeatures(table: RandomTable): boolean {
    return !!(
      table.defaultRollOptions ||
      table.table.some(entry => entry.modifiers || entry.metadata)
    );
  }

  function validateRelationships(relationships: TableRelationship[]): string[] {
    const errors: string[] = [];
    
    relationships.forEach((rel, index) => {
      if (!rel.targetTable) {
        errors.push(`Relationship ${index + 1}: Target table is required`);
      }
      
      if (rel.condition) {
        const validation = validateCondition(rel.condition);
        if (!validation.isValid) {
          errors.push(`Relationship ${index + 1}: Invalid condition - ${validation.error}`);
        }
      }
    });

    return errors;
  }

  function validateCondition(condition: string): { isValid: boolean; error?: string } {
    // Use the ConditionalEvaluator to validate
    try {
      // This is a simplified validation - in a real implementation,
      // we'd import and use ConditionalEvaluator.validate
      new Function(`return (${condition})`);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid syntax',
      };
    }
  }

  function validateRollOptions(options: AdvancedRollOptions): string[] {
    const errors: string[] = [];
    
    if (options.advantageCount !== undefined && options.advantageCount < 2) {
      errors.push('Advantage count must be at least 2');
    }
    
    if (options.maxRerolls !== undefined && options.maxRerolls < 0) {
      errors.push('Max rerolls must be non-negative');
    }
    
    if (options.modifiers) {
      if (options.modifiers.multiplier <= 0) {
        errors.push('Modifier multiplier must be positive');
      }
    }

    return errors;
  }

  return {
    get tables() {
      return tables;
    },
    addTable,
    removeTable,
    getTable,
    validateEnhancedTable,
    rollOnEnhancedTable,
    addRelationship,
    removeRelationship,
    getEnhancedStats,
    exportEnhancedTables,
    importEnhancedTables,
    getPerformanceMetrics,
  };
}