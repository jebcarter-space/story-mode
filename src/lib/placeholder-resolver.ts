import type { RandomTable, CustomTableList } from '../data/types';
import { rollOnTable } from './tables';
import { moreTables } from '../data/constants';

export interface ResolverOptions {
  customTables?: CustomTableList;
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
  private storyId: string;
  private maxDepth: number;
  private consumedStorage: { [key: string]: ConsumedEntry } = {};

  constructor(options: ResolverOptions = {}) {
    this.customTables = options.customTables || {};
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

  public resolve(text: string, depth: number = 0): string {
    if (depth >= this.maxDepth) {
      console.warn('Maximum placeholder resolution depth reached');
      return text;
    }

    // Find placeholders in the format {tableName} or {tableName.modifier} or {tableName.consumable}
    const placeholderRegex = /\{([^}]+)\}/g;
    
    return text.replace(placeholderRegex, (match, placeholder) => {
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
}