import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import type { RandomTable, CustomTableList, RollContext, AdvancedRollOptions, TableResult } from '../data/types';
import { dcTable } from '../data/tables';
import { PlaceholderResolver, type ResolverOptions } from './placeholder-resolver';
import { AdvancedTableRoller } from './advanced-table-engine';

// Global enhanced table roller instance
let enhancedRoller: AdvancedTableRoller | null = null;

/**
 * Initialize or update the enhanced table roller
 */
export function initializeEnhancedRoller(customTables: CustomTableList = {}, sparkTables: any = {}) {
  enhancedRoller = new AdvancedTableRoller(customTables, sparkTables);
}

/**
 * Enhanced table rolling with advanced features
 */
export async function rollOnEnhancedTable(
  table: RandomTable, 
  context: RollContext,
  rollOptions?: AdvancedRollOptions
): Promise<TableResult> {
  if (!enhancedRoller) {
    initializeEnhancedRoller();
  }

  return enhancedRoller!.rollWithModifiers(table, context, rollOptions);
}

/**
 * Original table rolling function (maintained for backward compatibility)
 */
export function rollOnTable(table: RandomTable, resolverOptions?: ResolverOptions) {
  const roll = new DiceRoll(table.diceFormula);
  const total = roll.total;
  let description = '';

  for (let i in table.table) {
    const row = table.table[i];
    const desc =
      typeof row.description === 'string'
        ? row.description.toString()
        : row.description().toString();
        if (row.min === null && (row.max && total <= (row.max as number))) description = desc;
        else if (row.max === null && (row.min && total >= (row.min as number))) description = desc;
        else if ((row.min && total >= (row.min as number)) && (row.max && total <= (row.max as number))) description = desc;
  }

  // If resolver options are provided, resolve placeholders in the description
  if (resolverOptions) {
    const resolver = new PlaceholderResolver(resolverOptions);
    description = resolver.resolve(description);
  }

  return { description, roll };
}

export function rollOnDCTable(dc: number) {
  const table = dcTable;
  const roll = new DiceRoll(table.diceFormula);
  const total = roll.total;
  let description = '';

  for (let i in table.table) {
    const row = table.table[i];
    const min = typeof row.min === 'string' ? dc + parseInt(row.min as string) : row.min;
    const max = typeof row.max === 'string' ? dc + parseInt(row.max as string) : row.max;

    const desc =
      typeof row.description === 'string'
        ? row.description.toString()
        : row.description().toString();
    if (min === null && (max && total <= (max as number))) description = desc;
    else if (max === null && (min && total >= (min as number))) description = desc;
    else if ((min && total >= (min as number)) && (max && total <= (max as number))) description = desc;
  }
  return { description, roll };
}
