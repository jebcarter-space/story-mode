import * as vscode from 'vscode';
import * as path from 'path';
import { SparkTableManager } from '../services/spark-table-manager';
import { ConfigurationService } from '../services/configuration-service';

/**
 * Table configuration picker for managing enabled tables
 */
export class TableConfigurationPicker {
  
  constructor(
    private context: vscode.ExtensionContext,
    private sparkTableManager: SparkTableManager
  ) {}

  /**
   * Show the main table configuration interface
   */
  async showTableConfiguration(): Promise<void> {
    const action = await vscode.window.showQuickPick([
      {
        label: 'Visual Table Manager',
        description: '🎨 Open enhanced visual table configuration interface',
        detail: 'Rich UI with table cards, toggles, sliders, and bulk operations'
      },
      {
        label: 'Configure Oracle Tables',
        description: 'Select which tables are enabled for Oracle queries',
        detail: 'Oracle provides Yes/No answers with keyword inspiration'
      },
      {
        label: 'Configure Sparks Tables', 
        description: 'Select which tables are enabled for Sparks generation',
        detail: 'Sparks provide creative keywords for story inspiration'
      },
      {
        label: 'View Current Configuration',
        description: 'Show currently configured tables',
        detail: 'See which tables are enabled for each feature'
      }
    ], {
      placeHolder: 'What would you like to configure?',
      title: 'Story Mode Table Configuration'
    });

    if (!action) return;

    switch (action.label) {
      case 'Visual Table Manager':
        await vscode.commands.executeCommand('story-mode.openTableManager');
        break;
      case 'Configure Oracle Tables':
        await this.configureOracleTables();
        break;
      case 'Configure Sparks Tables':
        await this.configureSparksTables();
        break;
      case 'View Current Configuration':
        await this.viewCurrentConfiguration();
        break;
    }
  }

  /**
   * Configure Oracle tables
   */
  private async configureOracleTables(): Promise<void> {
    const tables = this.sparkTableManager.getTables();
    const currentOracleTables = ConfigurationService.getOracleTables();
    
    const options = Object.entries(tables).map(([name, table]) => ({
      label: table.name,
      description: `${table.entries.length} entries`,
      detail: table.isDefault ? 'Default keywords' : `Source: ${path.basename(table.source)}`,
      picked: currentOracleTables.includes(name)
    }));

    const selected = await vscode.window.showQuickPick(options, {
      canPickMany: true,
      placeHolder: 'Select tables to enable for Oracle queries',
      title: 'Oracle Tables Configuration'
    });

    if (selected) {
      const selectedTableNames = selected.map(item => item.label);
      await ConfigurationService.updateOracleTables(selectedTableNames);
      
      vscode.window.showInformationMessage(
        `Oracle tables updated: ${selectedTableNames.length} table(s) enabled`
      );
    }
  }

  /**
   * Configure Sparks tables
   */
  private async configureSparksTables(): Promise<void> {
    const tables = this.sparkTableManager.getTables();
    const currentSparksTables = ConfigurationService.getSparksTables();
    
    const options = Object.entries(tables).map(([name, table]) => ({
      label: table.name,
      description: `${table.entries.length} entries`,
      detail: table.isDefault ? 'Default keywords' : `Source: ${path.basename(table.source)}`,
      picked: currentSparksTables.includes(name)
    }));

    const selected = await vscode.window.showQuickPick(options, {
      canPickMany: true,
      placeHolder: 'Select tables to enable for Sparks generation',
      title: 'Sparks Tables Configuration'
    });

    if (selected) {
      const selectedTableNames = selected.map(item => item.label);
      await ConfigurationService.updateSparksTables(selectedTableNames);
      
      vscode.window.showInformationMessage(
        `Sparks tables updated: ${selectedTableNames.length} table(s) enabled`
      );
    }
  }

  /**
   * View current configuration
   */
  private async viewCurrentConfiguration(): Promise<void> {
    const oracleTables = ConfigurationService.getOracleTables();
    const sparksTables = ConfigurationService.getSparksTables();
    const keywordCount = ConfigurationService.getSparkKeywordCount();
    
    const configInfo = [
      '**Current Table Configuration**',
      '',
      `**Oracle Tables (${oracleTables.length}):**`,
      ...oracleTables.map(table => `• ${table}`),
      '',
      `**Sparks Tables (${sparksTables.length}):**`,
      ...sparksTables.map(table => `• ${table}`),
      '',
      `**Settings:**`,
      `• Keyword Count: ${keywordCount}`,
      `• Default Table Enabled: ${ConfigurationService.isDefaultTableEnabled()}`,
      `• Include Table Names: ${ConfigurationService.shouldIncludeTableNames()}`
    ].join('\n');

    // Show in a new document for easy viewing
    const doc = await vscode.workspace.openTextDocument({
      content: configInfo,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(doc);
  }
}