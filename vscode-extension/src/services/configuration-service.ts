import * as vscode from 'vscode';

/**
 * Configuration service for managing Story Mode VSCode settings
 */
export class ConfigurationService {
  
  /**
   * Get Oracle tables configuration
   */
  static getOracleTables(): string[] {
    const config = vscode.workspace.getConfiguration('storyMode');
    const tables = config.get<string[]>('oracleTables', ['default']);
    return tables.length > 0 ? tables : ['default'];
  }

  /**
   * Get Sparks tables configuration  
   */
  static getSparksTables(): string[] {
    const config = vscode.workspace.getConfiguration('storyMode');
    const tables = config.get<string[]>('sparksTables', ['default']);
    return tables.length > 0 ? tables : ['default'];
  }

  /**
   * Update Oracle tables configuration
   */
  static async updateOracleTables(tables: string[]): Promise<void> {
    const config = vscode.workspace.getConfiguration('storyMode');
    await config.update('oracleTables', tables, vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Update Sparks tables configuration
   */
  static async updateSparksTables(tables: string[]): Promise<void> {
    const config = vscode.workspace.getConfiguration('storyMode');
    await config.update('sparksTables', tables, vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Get spark keyword count
   */
  static getSparkKeywordCount(): number {
    const config = vscode.workspace.getConfiguration('storyMode');
    return config.get<number>('sparkKeywordCount', 3);
  }

  /**
   * Check if default table is enabled
   */
  static isDefaultTableEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('storyMode');
    return config.get<boolean>('defaultTableEnabled', true);
  }

  /**
   * Check if table names should be included in output
   */
  static shouldIncludeTableNames(): boolean {
    const config = vscode.workspace.getConfiguration('storyMode');
    return config.get<boolean>('includeTableNames', false);
  }
}