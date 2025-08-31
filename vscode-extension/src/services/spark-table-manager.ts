import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationService } from './configuration-service';
import type { SparkTable, SparkTableList } from '../types';

export class SparkTableManager {
  private tables: SparkTableList = {};
  private _onTablesChanged = new vscode.EventEmitter<SparkTableList>();
  readonly onTablesChanged = this._onTablesChanged.event;

  constructor(private context: vscode.ExtensionContext) {
    this.loadTables();
  }

  /**
   * Load all spark tables from the .story-mode/spark-tables directory
   */
  async loadTables(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const sparkTablesPath = path.join(workspaceFolders[0].uri.fsPath, '.story-mode', 'spark-tables');
    
    // Ensure directory exists
    if (!fs.existsSync(sparkTablesPath)) {
      fs.mkdirSync(sparkTablesPath, { recursive: true });
      await this.createDefaultTable(sparkTablesPath);
    }

    // Clear existing tables
    this.tables = {};

    // Load default table first
    const defaultTablePath = path.join(sparkTablesPath, 'default.csv');
    if (fs.existsSync(defaultTablePath)) {
      const defaultTable = await this.loadTableFromFile(defaultTablePath, true);
      if (defaultTable) {
        this.tables['default'] = defaultTable;
      }
    } else {
      // Create default table if it doesn't exist
      await this.createDefaultTable(sparkTablesPath);
      const defaultTable = await this.loadTableFromFile(defaultTablePath, true);
      if (defaultTable) {
        this.tables['default'] = defaultTable;
      }
    }

    // Load other CSV files
    try {
      const files = fs.readdirSync(sparkTablesPath);
      const csvFiles = files.filter(file => 
        file.endsWith('.csv') && file !== 'default.csv'
      );

      for (const file of csvFiles) {
        const filePath = path.join(sparkTablesPath, file);
        const table = await this.loadTableFromFile(filePath, false);
        if (table) {
          this.tables[table.name] = table;
        }
      }
    } catch (error) {
      console.error('Error loading spark tables:', error);
    }

    this._onTablesChanged.fire(this.tables);
    
    // Initialize default table configurations if none exist
    await this.initializeDefaultConfiguration();
  }

  /**
   * Initialize default table configurations if none are set
   */
  private async initializeDefaultConfiguration(): Promise<void> {
    const oracleTables = ConfigurationService.getOracleTables();
    const sparksTables = ConfigurationService.getSparksTables();
    
    // If no configuration exists, set up defaults
    if (oracleTables.length === 1 && oracleTables[0] === 'default' && Object.keys(this.tables).length > 1) {
      const allTableNames = Object.keys(this.tables);
      await ConfigurationService.updateOracleTables(allTableNames);
      await ConfigurationService.updateSparksTables(allTableNames);
    }
  }

  /**
   * Load a single table from a CSV file
   */
  private async loadTableFromFile(filePath: string, isDefault: boolean): Promise<SparkTable | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      if (lines.length < 2) {
        return null; // Need at least header and one entry
      }

      const tableName = lines[0].trim();
      const entries = lines.slice(1)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const stats = fs.statSync(filePath);
      
      const table: SparkTable = {
        name: isDefault ? 'default' : path.basename(filePath, '.csv'),
        source: filePath,
        entries,
        lastModified: stats.mtime.getTime(),
        enabled: true, // Default to enabled
        weight: 1,
        oracleEnabled: true, // Default to both Oracle and Sparks
        sparksEnabled: true,
        categories: [],
        isDefault
      };

      return table;
    } catch (error) {
      console.error(`Error loading spark table from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Create the default table with hardcoded keywords
   */
  private async createDefaultTable(sparkTablesPath: string): Promise<void> {
    const defaultKeywords = [
      'mysterious', 'ancient', 'forbidden', 'hidden', 'sacred', 'cursed',
      'powerful', 'dangerous', 'magical', 'divine', 'demonic', 'ethereal',
      'betrayal', 'alliance', 'secret', 'treasure', 'turgid', 'decayed',
      'glitter', 'village', 'craft', 'guard', 'obligation', 'ruined',
      'twisted', 'premonition', 'obsidian', 'luminescent', 'sarcophagus'
      // Note: This is a minimal set for now, the full set is loaded from the existing default.csv
    ];

    const csvContent = 'Default Keywords\n' + defaultKeywords.join('\n');
    const defaultPath = path.join(sparkTablesPath, 'default.csv');
    
    // Only create if it doesn't exist
    if (!fs.existsSync(defaultPath)) {
      fs.writeFileSync(defaultPath, csvContent);
    }
  }

  /**
   * Get all loaded tables
   */
  getTables(): SparkTableList {
    return { ...this.tables };
  }

  /**
   * Get enabled tables for a specific use case
   */
  getEnabledTables(type: 'oracle' | 'sparks' | 'both' = 'both'): SparkTable[] {
    const oracleTables = ConfigurationService.getOracleTables();
    const sparksTables = ConfigurationService.getSparksTables();
    
    return Object.values(this.tables).filter(table => {
      switch (type) {
        case 'oracle':
          return oracleTables.includes(table.name);
        case 'sparks':
          return sparksTables.includes(table.name);
        case 'both':
          return oracleTables.includes(table.name) || sparksTables.includes(table.name);
        default:
          return true;
      }
    });
  }

  /**
   * Generate random keywords from enabled tables
   */
  generateKeywords(count: number = 2, type: 'oracle' | 'sparks' = 'sparks', tableNames?: string[]): string[] {
    let availableTables: SparkTable[];

    if (tableNames && tableNames.length > 0) {
      // Use specific tables
      availableTables = tableNames
        .map(name => this.tables[name])
        .filter(table => table && table.enabled);
    } else {
      // Use all enabled tables for the type
      availableTables = this.getEnabledTables(type);
    }

    if (availableTables.length === 0) {
      // Fallback to default table if no tables available
      const defaultTable = this.tables['default'];
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
          weightedEntries.push({ keyword: entry, table: table.name });
        }
      }
    }

    // Select random keywords
    const selected = new Set<string>();
    const keywords: string[] = [];

    while (keywords.length < count && weightedEntries.length > 0) {
      const randomIndex = Math.floor(Math.random() * weightedEntries.length);
      const { keyword } = weightedEntries[randomIndex];
      
      if (!selected.has(keyword)) {
        selected.add(keyword);
        keywords.push(keyword);
      }
      
      // Remove this entry to avoid duplicates
      weightedEntries.splice(randomIndex, 1);
    }

    return keywords;
  }

  /**
   * Get all available table names
   */
  getAvailableTableNames(): string[] {
    return Object.keys(this.tables);
  }

  /**
   * Check if a table is enabled for a specific type
   */
  isTableEnabled(tableName: string, type: 'oracle' | 'sparks'): boolean {
    const table = this.tables[tableName];
    if (!table) return false;
    
    const oracleTables = ConfigurationService.getOracleTables();
    const sparksTables = ConfigurationService.getSparksTables();
    
    switch (type) {
      case 'oracle':
        return oracleTables.includes(tableName);
      case 'sparks':
        return sparksTables.includes(tableName);
      default:
        return false;
    }
  }

  /**
   * Update table settings (enabled, weight, etc.)
   */
  updateTableSettings(tableName: string, settings: Partial<SparkTable>): void {
    const table = this.tables[tableName];
    if (table) {
      Object.assign(table, settings);
      // Note: In a full implementation, we'd persist these settings
      this._onTablesChanged.fire(this.tables);
    }
  }

  /**
   * Reload tables from filesystem
   */
  async reloadTables(): Promise<void> {
    await this.loadTables();
    
    // Notify Visual Table Manager to refresh if it's open
    vscode.commands.executeCommand('story-mode.refreshTableManager');
  }

  /**
   * Get table statistics
   */
  getTableStats(): { [tableName: string]: { entryCount: number; lastModified: number } } {
    const stats: { [tableName: string]: { entryCount: number; lastModified: number } } = {};
    
    for (const [name, table] of Object.entries(this.tables)) {
      stats[name] = {
        entryCount: table.entries.length,
        lastModified: table.lastModified
      };
    }
    
    return stats;
  }
}