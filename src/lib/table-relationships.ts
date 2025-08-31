import type { 
  TableRelationship, 
  TableResult, 
  RollContext, 
  RandomTable,
  CustomTableList,
  SparkTableList 
} from '../data/types';
import { ConditionalEvaluator } from './conditional-evaluator';
import { rollOnTable } from './tables';

/**
 * Manages relationships between tables and handles cascading rolls
 */
export class TableRelationshipManager {
  private relationships: Map<string, TableRelationship[]> = new Map();
  private customTables: CustomTableList;
  private sparkTables: SparkTableList;

  constructor(customTables: CustomTableList = {}, sparkTables: SparkTableList = {}) {
    this.customTables = customTables;
    this.sparkTables = sparkTables;
    this.loadRelationships();
  }

  /**
   * Load relationships from tables
   */
  private loadRelationships(): void {
    this.relationships.clear();

    // Load relationships from custom tables
    Object.entries(this.customTables).forEach(([tableName, table]) => {
      if (table.relationships) {
        this.relationships.set(tableName, table.relationships);
      }
    });
  }

  /**
   * Add a relationship between tables
   */
  addRelationship(relationship: TableRelationship): void {
    const sourceRelationships = this.relationships.get(relationship.sourceTable) || [];
    sourceRelationships.push(relationship);
    this.relationships.set(relationship.sourceTable, sourceRelationships);
  }

  /**
   * Remove a relationship
   */
  removeRelationship(sourceTable: string, targetTable: string): void {
    const relationships = this.relationships.get(sourceTable);
    if (relationships) {
      const filtered = relationships.filter(rel => rel.targetTable !== targetTable);
      this.relationships.set(sourceTable, filtered);
    }
  }

  /**
   * Get all relationships for a table
   */
  getRelationships(tableName: string): TableRelationship[] {
    return this.relationships.get(tableName) || [];
  }

  /**
   * Resolve all relationships for a table result
   */
  async resolveRelationships(result: TableResult, context: RollContext): Promise<TableResult> {
    if (!result.tableId) {
      return result;
    }

    const relationships = this.getRelationships(result.tableId);
    if (relationships.length === 0) {
      return result;
    }

    // Prevent infinite recursion
    if (context.depth >= 10) {
      console.warn('Maximum relationship depth reached');
      return result;
    }

    const linkedResults: TableResult[] = [];
    const newContext: RollContext = {
      ...context,
      depth: context.depth + 1,
      previousResults: [...context.previousResults, result],
    };

    for (const relationship of relationships) {
      try {
        if (await this.shouldTriggerRelationship(relationship, result, context)) {
          const linkedResult = await this.executeLinkedRoll(relationship, result, newContext);
          if (linkedResult) {
            linkedResults.push(linkedResult);
          }
        }
      } catch (error) {
        console.warn(`Failed to resolve relationship from ${relationship.sourceTable} to ${relationship.targetTable}:`, error);
      }
    }

    // Return the result with linked results
    return {
      ...result,
      linkedResults: linkedResults.length > 0 ? linkedResults : undefined,
    };
  }

  /**
   * Check if a relationship should be triggered
   */
  private async shouldTriggerRelationship(
    relationship: TableRelationship, 
    result: TableResult, 
    context: RollContext
  ): Promise<boolean> {
    // Check custom trigger condition first
    if (relationship.triggerCondition) {
      try {
        return relationship.triggerCondition(result, context);
      } catch (error) {
        console.warn('Custom trigger condition failed:', error);
        return false;
      }
    }

    // Check conditional expression
    if (relationship.condition) {
      const evaluation = ConditionalEvaluator.evaluate(relationship.condition, context);
      return evaluation.result;
    }

    // Different relationship types have different default triggers
    switch (relationship.type) {
      case 'parent-child':
        // Always trigger parent-child relationships
        return true;
      
      case 'cross-reference':
        // Check if the result description contains a reference pattern
        return this.hasTableReference(result.description, relationship.targetTable);
      
      case 'conditional-chain':
        // Only trigger if there's a condition and it evaluates to true
        return false; // Requires explicit condition
      
      default:
        return false;
    }
  }

  /**
   * Check if a description contains a reference to a table
   */
  private hasTableReference(description: string, tableName: string): boolean {
    const referencePatterns = [
      `{${tableName}}`,
      `{{${tableName}}}`,
      `[${tableName}]`,
      tableName.toLowerCase(),
    ];

    const lowerDescription = description.toLowerCase();
    return referencePatterns.some(pattern => lowerDescription.includes(pattern.toLowerCase()));
  }

  /**
   * Execute a linked table roll
   */
  private async executeLinkedRoll(
    relationship: TableRelationship,
    sourceResult: TableResult,
    context: RollContext
  ): Promise<TableResult | null> {
    const targetTable = this.findTable(relationship.targetTable);
    if (!targetTable) {
      console.warn(`Target table '${relationship.targetTable}' not found`);
      return null;
    }

    // Create enhanced context with relationship parameters
    const enhancedContext: RollContext = {
      ...context,
      variables: {
        ...context.variables,
        ...relationship.parameters,
        source_result: sourceResult.description,
        source_table: sourceResult.tableId,
      },
    };

    // Roll on the target table
    const result = rollOnTable(targetTable);
    
    const linkedResult: TableResult = {
      description: result.description,
      roll: result.roll,
      tableId: relationship.targetTable,
      context: enhancedContext,
    };

    // Recursively resolve relationships for the linked result
    return this.resolveRelationships(linkedResult, enhancedContext);
  }

  /**
   * Find a table by name in custom tables
   */
  private findTable(tableName: string): RandomTable | null {
    // Check custom tables
    const customTable = this.customTables[tableName];
    if (customTable) {
      return customTable;
    }

    // Check case-insensitive search
    const lowerTableName = tableName.toLowerCase();
    for (const [key, table] of Object.entries(this.customTables)) {
      if (key.toLowerCase() === lowerTableName || table.name.toLowerCase() === lowerTableName) {
        return table;
      }
    }

    return null;
  }

  /**
   * Get relationship statistics
   */
  getRelationshipStats(): {
    totalRelationships: number;
    relationshipsByType: Record<string, number>;
    tablesWithRelationships: number;
  } {
    let totalRelationships = 0;
    const relationshipsByType: Record<string, number> = {};
    const tablesWithRelationships = this.relationships.size;

    this.relationships.forEach(relationships => {
      totalRelationships += relationships.length;
      relationships.forEach(rel => {
        relationshipsByType[rel.type] = (relationshipsByType[rel.type] || 0) + 1;
      });
    });

    return {
      totalRelationships,
      relationshipsByType,
      tablesWithRelationships,
    };
  }

  /**
   * Validate relationships for circular dependencies
   */
  validateRelationships(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (tableName: string): boolean => {
      if (recursionStack.has(tableName)) {
        errors.push(`Circular dependency detected involving table: ${tableName}`);
        return true;
      }

      if (visited.has(tableName)) {
        return false;
      }

      visited.add(tableName);
      recursionStack.add(tableName);

      const relationships = this.getRelationships(tableName);
      for (const rel of relationships) {
        if (hasCycle(rel.targetTable)) {
          return true;
        }
      }

      recursionStack.delete(tableName);
      return false;
    };

    // Check each table for cycles
    for (const tableName of this.relationships.keys()) {
      if (!visited.has(tableName)) {
        hasCycle(tableName);
      }
    }

    // Check for missing target tables
    this.relationships.forEach((relationships, sourceTable) => {
      relationships.forEach(rel => {
        if (!this.findTable(rel.targetTable)) {
          errors.push(`Target table '${rel.targetTable}' not found for relationship from '${sourceTable}'`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export relationships as JSON
   */
  exportRelationships(): string {
    const exportData = Object.fromEntries(this.relationships);
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import relationships from JSON
   */
  importRelationships(jsonData: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonData);
      this.relationships.clear();
      
      Object.entries(data).forEach(([tableName, relationships]) => {
        if (Array.isArray(relationships)) {
          this.relationships.set(tableName, relationships as TableRelationship[]);
        }
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}