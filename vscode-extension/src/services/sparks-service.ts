import * as vscode from 'vscode';
import * as path from 'path';
import type { SparkResult } from '../types';
import { SparkTableManager } from './spark-table-manager';

export interface SparksHistory {
  result: SparkResult;
  timestamp: number;
}

export class SparksService {
  private history: SparksHistory[] = [];

  constructor(private sparkTableManager: SparkTableManager) {}

  /**
   * Generate sparks (2-3 keywords) from enabled tables
   */
  generateSparks(count?: number, tableNames?: string[]): SparkResult {
    const keywordCount = count || vscode.workspace.getConfiguration('storyMode').get('sparkKeywordCount', 3);
    
    const keywords = this.sparkTableManager.generateKeywords(
      keywordCount, 
      'sparks', 
      tableNames
    );

    const result: SparkResult = {
      keywords,
      tableNames: tableNames || this.sparkTableManager.getEnabledTables('sparks').map(t => t.name),
      timestamp: Date.now()
    };

    // Add to history
    this.addToHistory(result);

    return result;
  }

  /**
   * Generate sparks for Oracle (2 keywords by default)
   */
  generateOracleKeywords(count: number = 2, tableNames?: string[]): string[] {
    return this.sparkTableManager.generateKeywords(
      count,
      'oracle',
      tableNames
    );
  }

  /**
   * Format sparks result for display
   */
  formatSparks(result: SparkResult, includeFormatting = true): string {
    if (!includeFormatting) {
      return result.keywords.join(', ');
    }

    let formatted = `**Sparks:** ${result.keywords.join(', ')}\n`;
    
    const config = vscode.workspace.getConfiguration('storyMode');
    const includeTableNames = config.get('includeTableNames', false);
    
    if (includeTableNames && result.tableNames && result.tableNames.length > 0) {
      formatted += `*Source Tables: ${result.tableNames.join(', ')}*\n`;
    }
    
    return formatted;
  }

  /**
   * Generate sparks and insert into editor
   */
  async insertSparks(count?: number, tableNames?: string[]): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active text editor');
      return;
    }

    const sparks = this.generateSparks(count, tableNames);
    const formatted = this.formatSparks(sparks);

    await editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, formatted);
    });
  }

  /**
   * Generate sparks and return formatted string for AI continuation
   */
  generateSparksForContinuation(count?: number, tableNames?: string[]): string {
    const sparks = this.generateSparks(count, tableNames);
    return this.formatSparks(sparks);
  }

  /**
   * Get available table names
   */
  getAvailableTableNames(): string[] {
    return Object.keys(this.sparkTableManager.getTables());
  }

  /**
   * Get enabled table names for sparks
   */
  getEnabledTableNames(): string[] {
    return this.sparkTableManager.getEnabledTables('sparks').map(t => t.name);
  }

  /**
   * Add result to history
   */
  private addToHistory(result: SparkResult): void {
    this.history.push({
      result,
      timestamp: Date.now()
    });

    // Keep only last 50 entries
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
  }

  /**
   * Get sparks history
   */
  getHistory(): SparksHistory[] {
    return [...this.history];
  }

  /**
   * Clear sparks history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get quick pick options for table selection
   */
  async getTableQuickPickOptions(): Promise<vscode.QuickPickItem[]> {
    const tables = this.sparkTableManager.getTables();
    const stats = this.sparkTableManager.getTableStats();

    return Object.entries(tables).map(([name, table]) => ({
      label: table.name,
      description: `${stats[name]?.entryCount || 0} entries`,
      detail: table.isDefault ? 'Default keywords' : `Source: ${path.basename(table.source)}`,
      picked: table.enabled && table.sparksEnabled
    }));
  }

  /**
   * Show table selection quick pick
   */
  async showTableSelectionPicker(): Promise<string[] | undefined> {
    const options = await this.getTableQuickPickOptions();
    
    const selected = await vscode.window.showQuickPick(options, {
      canPickMany: true,
      placeHolder: 'Select tables to use for sparks generation',
      title: 'Spark Tables'
    });

    return selected?.map(item => item.label);
  }
}