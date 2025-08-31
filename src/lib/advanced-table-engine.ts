import type { 
  RandomTable, 
  TableResult, 
  RollContext, 
  AdvancedRollOptions,
  WeightedEntry,
  TableModifier,
  MinMaxRow,
  CustomTableList,
  SparkTableList
} from '../data/types';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { ConditionalEvaluator } from './conditional-evaluator';
import { TableRelationshipManager } from './table-relationships';
import { TablePerformanceOptimizer } from './table-performance';
import { rollOnTable as basicRollOnTable } from './tables';

/**
 * Advanced table rolling engine with modifiers, relationships, and performance optimizations
 */
export class AdvancedTableRoller {
  private relationshipManager: TableRelationshipManager;
  private performanceOptimizer: TablePerformanceOptimizer;
  private customTables: CustomTableList;
  private sparkTables: SparkTableList;

  constructor(customTables: CustomTableList = {}, sparkTables: SparkTableList = {}) {
    this.customTables = customTables;
    this.sparkTables = sparkTables;
    this.relationshipManager = new TableRelationshipManager(customTables, sparkTables);
    this.performanceOptimizer = new TablePerformanceOptimizer();
  }

  /**
   * Roll on a table with advanced options and modifiers
   */
  async rollWithModifiers(
    table: RandomTable, 
    context: RollContext,
    rollOptions?: AdvancedRollOptions
  ): Promise<TableResult> {
    const startTime = performance.now();
    
    try {
      // Check cache first
      const cacheKey = this.performanceOptimizer.generateCacheKey(table.name, context);
      const cachedResult = this.performanceOptimizer.getCachedResult(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Merge roll options
      const options = this.mergeRollOptions(table.defaultRollOptions, rollOptions);
      
      // Filter entries based on conditions
      const availableEntries = await this.filterEntriesByConditions(table, context);
      
      if (availableEntries.length === 0) {
        throw new Error(`No available entries in table '${table.name}' after applying conditions`);
      }

      // Apply weighting if needed
      const weightedEntries = this.applyWeighting(availableEntries, context);

      // Perform the roll
      const selectedEntry = await this.performRoll(weightedEntries, options, context);
      
      // Create the result
      let result: TableResult = {
        description: this.resolveDescription(selectedEntry, context),
        roll: selectedEntry.roll,
        tableId: table.name,
        entryId: selectedEntry.id,
        metadata: selectedEntry.metadata,
        rollOptions: options,
        context,
      };

      // Handle unique modifier (mark as consumed)
      if (selectedEntry.modifiers?.some(m => m.type === 'unique')) {
        this.markEntryAsConsumed(table.name, selectedEntry, context);
      }

      // Resolve relationships
      if (table.enhanced && table.relationships) {
        result = await this.relationshipManager.resolveRelationships(result, context);
      }

      // Cache the result
      this.performanceOptimizer.cacheResult(cacheKey, result);

      // Record performance metrics
      const duration = performance.now() - startTime;
      this.performanceOptimizer.recordTiming('rollTime', duration);

      return result;
    } catch (error) {
      console.error('Advanced table roll failed:', error);
      // Fallback to basic roll
      const fallbackResult = basicRollOnTable(table);
      return {
        description: fallbackResult.description,
        roll: fallbackResult.roll,
        tableId: table.name,
        context,
      };
    }
  }

  /**
   * Filter table entries based on conditional modifiers
   */
  private async filterEntriesByConditions(
    table: RandomTable, 
    context: RollContext
  ): Promise<MinMaxRow[]> {
    const availableEntries: MinMaxRow[] = [];

    for (const entry of table.table) {
      let include = true;

      // Check conditional modifiers
      if (entry.modifiers) {
        for (const modifier of entry.modifiers) {
          if (modifier.type === 'conditional' && modifier.condition) {
            const evaluation = ConditionalEvaluator.evaluate(modifier.condition, context);
            if (!evaluation.result) {
              include = false;
              break;
            }
          }
        }
      }

      if (include) {
        availableEntries.push(entry);
      }
    }

    return availableEntries;
  }

  /**
   * Apply weighting to entries based on modifiers
   */
  private applyWeighting(entries: MinMaxRow[], context: RollContext): WeightedEntry[] {
    return entries.map(entry => {
      let weight = 1; // Default weight

      if (entry.modifiers) {
        for (const modifier of entry.modifiers) {
          if (modifier.type === 'weighted') {
            weight = modifier.weight || 1;
            
            // Check for conditional weights
            if (modifier.parameters?.conditionalWeights) {
              for (const condWeight of modifier.parameters.conditionalWeights) {
                if (condWeight.condition) {
                  const evaluation = ConditionalEvaluator.evaluate(condWeight.condition, context);
                  if (evaluation.result) {
                    weight = condWeight.weight;
                    break; // Use first matching conditional weight
                  }
                }
              }
            }
            break; // Use first weighted modifier
          }
        }
      }

      return { entry, weight };
    });
  }

  /**
   * Perform the actual dice roll with advanced options
   */
  private async performRoll(
    weightedEntries: WeightedEntry[], 
    options: AdvancedRollOptions,
    context: RollContext
  ): Promise<MinMaxRow & { roll: any; id?: string }> {
    const rollType = options.rollType || 'standard';
    let roll: DiceRoll;
    let selectedEntry: MinMaxRow;

    switch (rollType) {
      case 'advantage':
        roll = this.rollWithAdvantage(options.advantageCount || 2);
        break;
      case 'disadvantage':
        roll = this.rollWithDisadvantage();
        break;
      case 'exploding':
        roll = this.rollExploding();
        break;
      case 'reroll':
        roll = await this.rollWithReroll(options.rerollCondition, options.maxRerolls || 3, context);
        break;
      default:
        roll = new DiceRoll('1d100'); // Default to d100 for weighted selection
    }

    // Apply modifiers
    let total = roll.total;
    if (options.modifiers) {
      total += options.modifiers.bonus;
      total *= options.modifiers.multiplier;
      
      if (options.modifiers.threshold && total < options.modifiers.threshold) {
        total = options.modifiers.threshold;
      }
    }

    // Select entry based on weight
    selectedEntry = this.selectWeightedEntry(weightedEntries, total);

    return {
      ...selectedEntry,
      roll,
      id: this.generateEntryId(selectedEntry),
    };
  }

  /**
   * Select an entry based on weighted probability
   */
  private selectWeightedEntry(weightedEntries: WeightedEntry[], rollValue: number): MinMaxRow {
    // Calculate total weight
    const totalWeight = weightedEntries.reduce((sum, item) => sum + item.weight, 0);
    
    if (totalWeight === 0) {
      // If no weights, fall back to normal dice roll selection
      return this.selectByDiceRoll(weightedEntries.map(w => w.entry), rollValue);
    }

    // Normalize roll value to weight range
    const normalizedRoll = (rollValue / 100) * totalWeight;
    
    // Select based on cumulative weights
    let cumulativeWeight = 0;
    for (const weightedEntry of weightedEntries) {
      cumulativeWeight += weightedEntry.weight;
      if (normalizedRoll <= cumulativeWeight) {
        return weightedEntry.entry;
      }
    }

    // Fallback to last entry
    return weightedEntries[weightedEntries.length - 1].entry;
  }

  /**
   * Select entry using traditional min/max dice roll
   */
  private selectByDiceRoll(entries: MinMaxRow[], rollValue: number): MinMaxRow {
    for (const entry of entries) {
      const min = typeof entry.min === 'number' ? entry.min : parseInt(entry.min as string || '0');
      const max = typeof entry.max === 'number' ? entry.max : parseInt(entry.max as string || '100');
      
      if (rollValue >= min && rollValue <= max) {
        return entry;
      }
    }
    
    // Fallback to first entry
    return entries[0];
  }

  /**
   * Roll with advantage (multiple dice, take highest)
   */
  private rollWithAdvantage(count: number = 2): DiceRoll {
    let highest = 0;
    let allRolls: DiceRoll[] = [];

    for (let i = 0; i < count; i++) {
      const roll = new DiceRoll('1d100');
      allRolls.push(roll);
      if (roll.total > highest) {
        highest = roll.total;
      }
    }

    // Create a mock roll with the highest value
    const result = new DiceRoll('1d100');
    // @ts-ignore - Accessing private property for testing
    result._total = highest;
    return result;
  }

  /**
   * Roll with disadvantage (two dice, take lowest)
   */
  private rollWithDisadvantage(): DiceRoll {
    const roll1 = new DiceRoll('1d100');
    const roll2 = new DiceRoll('1d100');
    const lowest = Math.min(roll1.total, roll2.total);

    // Create a mock roll with the lowest value
    const result = new DiceRoll('1d100');
    // @ts-ignore - Accessing private property for testing
    result._total = lowest;
    return result;
  }

  /**
   * Roll with exploding dice (reroll on max value)
   */
  private rollExploding(): DiceRoll {
    let total = 0;
    let roll: DiceRoll;
    
    do {
      roll = new DiceRoll('1d100');
      total += roll.total;
    } while (roll.total === 100); // Keep rolling on 100

    // Create a mock roll with the exploded total
    const result = new DiceRoll('1d100');
    // @ts-ignore - Accessing private property for testing
    result._total = Math.min(total, 100); // Cap at 100 for table lookup
    return result;
  }

  /**
   * Roll with reroll condition
   */
  private async rollWithReroll(
    rerollCondition?: string, 
    maxRerolls: number = 3,
    context?: RollContext
  ): Promise<DiceRoll> {
    let roll = new DiceRoll('1d100');
    let rerollCount = 0;

    while (rerollCount < maxRerolls && rerollCondition) {
      // Create context for reroll evaluation
      const rollContext: RollContext = {
        ...context,
        variables: {
          ...context?.variables,
          roll_value: roll.total,
          reroll_count: rerollCount,
        },
      } as RollContext;

      const evaluation = ConditionalEvaluator.evaluate(rerollCondition, rollContext);
      if (!evaluation.result) {
        break; // Don't reroll
      }

      roll = new DiceRoll('1d100');
      rerollCount++;
    }

    return roll;
  }

  /**
   * Resolve description with any embedded expressions
   */
  private resolveDescription(entry: MinMaxRow, context: RollContext): string {
    const description = typeof entry.description === 'string' 
      ? entry.description 
      : entry.description().toString();

    // Handle linked modifiers
    if (entry.modifiers) {
      for (const modifier of entry.modifiers) {
        if (modifier.type === 'linked' && modifier.dependency) {
          // This would trigger a linked table roll
          // For now, just add a marker that can be processed later
          return `${description} [LINKED:${modifier.dependency}]`;
        }
      }
    }

    return description;
  }

  /**
   * Mark an entry as consumed for unique modifier
   */
  private markEntryAsConsumed(tableName: string, entry: MinMaxRow, context: RollContext): void {
    // This would integrate with the existing consumable system
    // For now, just log it
    console.log(`Marking entry as consumed: ${tableName} - ${entry.description}`);
  }

  /**
   * Generate a unique ID for a table entry
   */
  private generateEntryId(entry: MinMaxRow): string {
    const description = typeof entry.description === 'string' 
      ? entry.description 
      : entry.description().toString();
    return btoa(description).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  }

  /**
   * Merge roll options with defaults
   */
  private mergeRollOptions(
    defaultOptions?: AdvancedRollOptions, 
    rollOptions?: AdvancedRollOptions
  ): AdvancedRollOptions {
    return {
      rollType: rollOptions?.rollType || defaultOptions?.rollType || 'standard',
      rerollCondition: rollOptions?.rerollCondition || defaultOptions?.rerollCondition,
      advantageCount: rollOptions?.advantageCount || defaultOptions?.advantageCount || 2,
      modifiers: {
        bonus: 0,
        multiplier: 1,
        threshold: 0,
        ...defaultOptions?.modifiers,
        ...rollOptions?.modifiers,
      },
      maxRerolls: rollOptions?.maxRerolls || defaultOptions?.maxRerolls || 3,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceOptimizer.getPerformanceMetrics();
  }

  /**
   * Get relationship manager for configuration
   */
  getRelationshipManager() {
    return this.relationshipManager;
  }

  /**
   * Get performance optimizer for configuration
   */
  getPerformanceOptimizer() {
    return this.performanceOptimizer;
  }
}