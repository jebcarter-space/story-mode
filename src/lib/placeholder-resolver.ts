import type { RandomTable, CustomTableList, SparkTableList } from '../data/types';
import { rollOnTable } from './tables';
import { moreTables } from '../data/constants';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';

export interface ResolverOptions {
  customTables?: CustomTableList;
  sparkTables?: SparkTableList;
  storyId?: string;
  maxDepth?: number;
}

export interface ConsumedEntry {
  tableId: string;
  storyId: string;
  consumedItems: string[];
}

export class PlaceholderResolver {
  private customTables: CustomTableList;
  private sparkTables: SparkTableList;
  private storyId: string;
  private maxDepth: number;
  private consumedStorage: { [key: string]: ConsumedEntry } = {};

  constructor(options: ResolverOptions = {}) {
    this.customTables = options.customTables || {};
    this.sparkTables = options.sparkTables || {};
    this.storyId = options.storyId || 'default';
    this.maxDepth = options.maxDepth || 10;
    this.loadConsumedEntries();
  }

  private loadConsumedEntries(): void {
    const stored = localStorage.getItem('consumed-tables');
    this.consumedStorage = stored ? JSON.parse(stored) : {};
  }

  private saveConsumedEntries(): void {
    localStorage.setItem('consumed-tables', JSON.stringify(this.consumedStorage));
  }

  private getConsumedKey(tableName: string): string {
    return `${tableName.toLowerCase()}_${this.storyId}`;
  }

  private markAsConsumed(tableName: string, item: string): void {
    const key = this.getConsumedKey(tableName);
    if (!this.consumedStorage[key]) {
      this.consumedStorage[key] = {
        tableId: tableName,
        storyId: this.storyId,
        consumedItems: []
      };
    }
    if (!this.consumedStorage[key].consumedItems.includes(item)) {
      this.consumedStorage[key].consumedItems.push(item);
      this.saveConsumedEntries();
    }
  }

  private getAvailableEntries(table: RandomTable, tableName: string): RandomTable {
    const key = this.getConsumedKey(tableName);
    const consumed = this.consumedStorage[key]?.consumedItems || [];
    
    if (consumed.length === 0) {
      return table;
    }

    const availableEntries = table.table.filter(entry => {
      const desc = typeof entry.description === 'string' 
        ? entry.description.toString()
        : entry.description().toString();
      return !consumed.includes(desc);
    });

    // If all entries are consumed, reset and use all entries
    if (availableEntries.length === 0) {
      delete this.consumedStorage[key];
      this.saveConsumedEntries();
      return table;
    }

    return {
      ...table,
      table: availableEntries
    };
  }

  private findTable(tableName: string): RandomTable | null {
    // Check built-in tables first (case-insensitive)
    const lowerTableName = tableName.toLowerCase();
    const exactMatch = moreTables[tableName];
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try case-insensitive search for built-in tables
    for (const [key, table] of Object.entries(moreTables)) {
      if (key.toLowerCase() === lowerTableName || table.name.toLowerCase() === lowerTableName) {
        return table;
      }
    }
    
    // Check custom tables (case-insensitive)
    const customExactMatch = this.customTables[tableName];
    if (customExactMatch) {
      return customExactMatch;
    }
    
    for (const [key, table] of Object.entries(this.customTables)) {
      if (key.toLowerCase() === lowerTableName || table.name.toLowerCase() === lowerTableName) {
        return table;
      }
    }
    
    return null;
  }

  private applyModifier(text: string, modifier: string): string {
    switch (modifier) {
      case 'capitalize':
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      case 'uppercase':
        return text.toUpperCase();
      case 'lowercase':
        return text.toLowerCase();
      case 'plural':
        return this.pluralize(text);
      case 'singular':
        return this.singularize(text);
      case 'article':
        return this.addIndefiniteArticle(text);
      case 'the':
        return `the ${text}`;
      default:
        return text;
    }
  }

  private pluralize(text: string): string {
    // Simple pluralization rules
    const word = text.trim();
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || 
        word.endsWith('ch') || word.endsWith('sh')) {
      return word + 'es';
    } else if (word.endsWith('y') && !this.isVowel(word[word.length - 2])) {
      return word.slice(0, -1) + 'ies';
    } else if (word.endsWith('f')) {
      return word.slice(0, -1) + 'ves';
    } else if (word.endsWith('fe')) {
      return word.slice(0, -2) + 'ves';
    } else {
      return word + 's';
    }
  }

  private singularize(text: string): string {
    // Simple singularization rules (reverse of pluralization)
    const word = text.trim();
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    } else if (word.endsWith('ves')) {
      return word.slice(0, -3) + 'f';
    } else if (word.endsWith('es') && (word.endsWith('ses') || word.endsWith('xes') || 
               word.endsWith('zes') || word.endsWith('ches') || word.endsWith('shes'))) {
      return word.slice(0, -2);
    } else if (word.endsWith('s') && !word.endsWith('ss')) {
      return word.slice(0, -1);
    }
    return word;
  }

  private addIndefiniteArticle(text: string): string {
    const firstChar = text.charAt(0).toLowerCase();
    const article = this.isVowel(firstChar) ? 'an' : 'a';
    return `${article} ${text}`;
  }

  private isVowel(char: string): boolean {
    return 'aeiou'.includes(char.toLowerCase());
  }

  private handleRandomRange(rangeStr: string): string {
    const match = rangeStr.match(/^(\d+)-(\d+)$/);
    if (!match) {
      console.warn(`Invalid range format: ${rangeStr}. Expected format: min-max`);
      return rangeStr;
    }
    
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    if (min > max) {
      console.warn(`Invalid range: ${rangeStr}. Min should be less than or equal to max`);
      return rangeStr;
    }
    
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  private handleDiceRoll(diceStr: string): string {
    try {
      const roll = new DiceRoll(diceStr);
      return roll.total.toString();
    } catch (error) {
      console.warn(`Invalid dice formula: ${diceStr}`, error);
      return diceStr;
    }
  }

  private handleMultiplePicks(tableName: string, pickCount: number, isConsumable: boolean = false): string {
    const table = this.findTable(tableName);
    if (!table) {
      console.warn(`Table '${tableName}' not found`);
      return `{${tableName}.pick ${pickCount}}`;
    }

    const results: string[] = [];
    let tableToUse = isConsumable ? this.getAvailableEntries(table, tableName) : table;
    
    for (let i = 0; i < pickCount; i++) {
      // If table is exhausted and consumable, reset it
      if (isConsumable && tableToUse.table.length === 0) {
        this.resetConsumption(tableName);
        tableToUse = table;
      }
      
      if (tableToUse.table.length === 0) {
        break; // No more entries available
      }

      const result = rollOnTable(tableToUse);
      let resultText = result.description;

      // Mark as consumed if needed
      if (isConsumable) {
        this.markAsConsumed(tableName, resultText);
        // Update available entries for next pick
        tableToUse = this.getAvailableEntries(table, tableName);
      }

      results.push(resultText);
    }

    return results.join(', ');
  }

  public resolve(text: string, depth: number = 0): string {
    if (depth >= this.maxDepth) {
      console.warn('Maximum placeholder resolution depth reached');
      return text;
    }

    // Find placeholders in the format {tableName} or {tableName.modifier} or {tableName.consumable}
    const placeholderRegex = /\{([^}]+)\}/g;
    
    return text.replace(placeholderRegex, (match, placeholder) => {
      // Handle special syntax cases first
      
      // Handle random range: {rand min-max}
      if (placeholder.startsWith('rand ')) {
        const rangeStr = placeholder.substring(5);
        return this.handleRandomRange(rangeStr);
      }
      
      // Handle dice roll: {roll XdY+Z}
      if (placeholder.startsWith('roll ')) {
        const diceStr = placeholder.substring(5);
        return this.handleDiceRoll(diceStr);
      }
      
      // Handle spark keywords: {spark:tableName} or {sparks:tableName1,tableName2:count}
      if (placeholder.startsWith('spark:') || placeholder.startsWith('sparks:')) {
        return this.handleSparkKeywords(placeholder);
      }
      
      // Handle table with pick modifier: {tableName.pick N} or {tableName.consumable.pick N}
      const pickMatch = placeholder.match(/^(.+)\.pick\s+(\d+)$/);
      if (pickMatch) {
        const tableWithModifiers = pickMatch[1];
        const pickCount = parseInt(pickMatch[2]);
        const parts = tableWithModifiers.split('.');
        const tableName = parts[0];
        const modifiers = parts.slice(1);
        const isConsumable = modifiers.includes('consumable');
        
        const result = this.handleMultiplePicks(tableName, pickCount, isConsumable);
        // Recursively resolve any placeholders in the result
        return this.resolve(result, depth + 1);
      }
      
      // Handle standard table lookup with modifiers
      const parts = placeholder.split('.');
      const tableName = parts[0];
      const modifiers = parts.slice(1); // Get all modifiers after the table name
      
      const table = this.findTable(tableName);
      if (!table) {
        console.warn(`Table '${tableName}' not found`);
        return match; // Return original placeholder if table not found
      }

      let tableToUse = table;
      let isConsumable = false;

      // Check if consumable modifier is used or table has consumable flag
      if (modifiers.includes('consumable') || table.consumable) {
        isConsumable = true;
        tableToUse = this.getAvailableEntries(table, tableName);
      }

      // Roll on the table
      const result = rollOnTable(tableToUse);
      let resultText = result.description;

      // Mark as consumed if needed
      if (isConsumable) {
        this.markAsConsumed(tableName, resultText);
      }

      // Apply modifiers in order (excluding 'consumable')
      const textModifiers = modifiers.filter((mod: string) => mod !== 'consumable');
      for (const modifier of textModifiers) {
        resultText = this.applyModifier(resultText, modifier);
      }

      // Recursively resolve any placeholders in the result
      return this.resolve(resultText, depth + 1);
    });
  }

  public resetConsumption(tableName?: string): void {
    if (tableName) {
      const key = this.getConsumedKey(tableName);
      delete this.consumedStorage[key];
    } else {
      // Reset all consumption for this story
      Object.keys(this.consumedStorage).forEach(key => {
        if (key.endsWith(`_${this.storyId}`)) {
          delete this.consumedStorage[key];
        }
      });
    }
    this.saveConsumedEntries();
  }

  public getConsumedItems(tableName: string): string[] {
    const key = this.getConsumedKey(tableName);
    return this.consumedStorage[key]?.consumedItems || [];
  }

  private handleSparkKeywords(placeholder: string): string {
    // Parse spark syntax: spark:tableName or sparks:table1,table2:count
    if (placeholder.startsWith('spark:')) {
      // Single keyword from specific table
      const tableName = placeholder.substring(6);
      return this.generateSparkKeywords(1, tableName ? [tableName] : undefined);
    } else if (placeholder.startsWith('sparks:')) {
      // Multiple keywords, parse tables and count
      const params = placeholder.substring(7);
      const parts = params.split(':');
      
      let tableNames: string[] | undefined;
      let count = 2; // default
      
      if (parts.length === 1) {
        // Just table names: sparks:table1,table2
        tableNames = parts[0] ? parts[0].split(',').map(t => t.trim()).filter(t => t.length > 0) : undefined;
      } else if (parts.length === 2) {
        // Table names and count: sparks:table1,table2:3
        tableNames = parts[0] ? parts[0].split(',').map(t => t.trim()).filter(t => t.length > 0) : undefined;
        const countNum = parseInt(parts[1]);
        if (!isNaN(countNum) && countNum > 0) {
          count = countNum;
        }
      }
      
      return this.generateSparkKeywords(count, tableNames);
    }
    
    return placeholder; // fallback
  }

  private generateSparkKeywords(count: number = 2, tableNames?: string[]): string {
    // Get available spark tables
    let availableTables = Object.values(this.sparkTables).filter(table => 
      table.enabled && table.sparksEnabled
    );
    
    // Filter by specific table names if provided
    if (tableNames && tableNames.length > 0) {
      availableTables = availableTables.filter(table => 
        tableNames.includes(table.name) || tableNames.includes(table.name.toLowerCase())
      );
    }
    
    if (availableTables.length === 0) {
      console.warn('No available spark tables found');
      return '[no spark tables]';
    }
    
    // Create weighted pool of keywords
    const weightedKeywords: string[] = [];
    for (const table of availableTables) {
      const weight = table.weight || 1;
      for (let w = 0; w < weight; w++) {
        weightedKeywords.push(...table.entries);
      }
    }
    
    if (weightedKeywords.length === 0) {
      return '[no keywords available]';
    }
    
    // Select random keywords without duplicates
    const selected = new Set<string>();
    const keywords: string[] = [];
    
    while (keywords.length < count && selected.size < weightedKeywords.length) {
      const randomIndex = Math.floor(Math.random() * weightedKeywords.length);
      const keyword = weightedKeywords[randomIndex];
      
      if (!selected.has(keyword.toLowerCase())) {
        selected.add(keyword.toLowerCase());
        keywords.push(keyword);
      }
    }
    
    return keywords.join(', ');
  }
}