import * as vscode from 'vscode';
import * as path from 'path';
import { SparkTableManager } from '../services/spark-table-manager';
import { ConfigurationService } from '../services/configuration-service';
import { TableAnalyticsService } from '../services/table-analytics-service';
import type { SparkTable } from '../types';

/**
 * Visual table manager webview panel for enhanced table configuration
 */
export class TableManagerWebview {
  private static readonly viewType = 'storyMode.tableManager';
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private sparkTableManager: SparkTableManager,
    private analyticsService?: TableAnalyticsService
  ) {}

  /**
   * Show or create the table manager webview panel
   */
  public show(): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (this.panel) {
      this.panel.reveal(column);
      return;
    }

    // Create new panel
    this.panel = vscode.window.createWebviewPanel(
      TableManagerWebview.viewType,
      'Spark Table Configuration',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'src', 'ui'),
          vscode.Uri.joinPath(this.context.extensionUri, 'resources')
        ]
      }
    );

    // Set the webview's initial html content
    this.panel.webview.html = this.getWebviewContent();

    // Listen for when the panel is disposed
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.context.subscriptions
    );

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'refresh':
            this.refreshTableData();
            break;
          case 'toggleTable':
            this.toggleTableEnabled(message.tableName, message.enabled, message.type);
            break;
          case 'updateWeight':
            this.updateTableWeight(message.tableName, message.weight);
            break;
          case 'previewTable':
            this.previewTable(message.tableName);
            break;
          case 'bulkEnable':
            this.bulkEnableDisable(true);
            break;
          case 'bulkDisable':
            this.bulkEnableDisable(false);
            break;
          case 'resetWeights':
            this.resetWeights();
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    // Send initial data
    this.refreshTableData();
  }

  /**
   * Refresh the webview (external API)
   */
  public refresh(): void {
    this.refreshTableData();
  }

  /**
   * Refresh table data in the webview
   */
  private refreshTableData(): void {
    if (!this.panel) return;

    const tables = this.sparkTableManager.getTables();
    const oracleTables = ConfigurationService.getOracleTables();
    const sparksTables = ConfigurationService.getSparksTables();
    const keywordCount = ConfigurationService.getSparkKeywordCount();

    // Enhance tables with configuration info and analytics
    const enhancedTables = Object.entries(tables).map(([name, table]) => {
      const analytics = this.analyticsService?.getEnrichedStats(name);
      return {
        ...table,
        oracleConfigEnabled: oracleTables.includes(name),
        sparksConfigEnabled: sparksTables.includes(name),
        lastUsed: analytics?.lastUsed || null,
        usageCount: analytics?.totalUses || 0,
        daysSinceLastUse: analytics?.daysSinceLastUse || null,
        preferredContext: analytics?.preferredContext || 'sparks'
      };
    });

    this.panel.webview.postMessage({
      type: 'updateData',
      tables: enhancedTables,
      configuration: {
        oracleTables,
        sparksTables,
        keywordCount,
        defaultTableEnabled: ConfigurationService.isDefaultTableEnabled(),
        includeTableNames: ConfigurationService.shouldIncludeTableNames()
      }
    });
  }

  /**
   * Toggle table enabled state
   */
  private async toggleTableEnabled(tableName: string, enabled: boolean, type: 'oracle' | 'sparks'): Promise<void> {
    const currentOracleTables = ConfigurationService.getOracleTables();
    const currentSparksTables = ConfigurationService.getSparksTables();

    if (type === 'oracle') {
      if (enabled && !currentOracleTables.includes(tableName)) {
        await ConfigurationService.updateOracleTables([...currentOracleTables, tableName]);
      } else if (!enabled && currentOracleTables.includes(tableName)) {
        await ConfigurationService.updateOracleTables(currentOracleTables.filter(name => name !== tableName));
      }
    } else if (type === 'sparks') {
      if (enabled && !currentSparksTables.includes(tableName)) {
        await ConfigurationService.updateSparksTables([...currentSparksTables, tableName]);
      } else if (!enabled && currentSparksTables.includes(tableName)) {
        await ConfigurationService.updateSparksTables(currentSparksTables.filter(name => name !== tableName));
      }
    }

    this.refreshTableData();
    this.showStatusMessage(`${tableName} ${enabled ? 'enabled' : 'disabled'} for ${type}`);
  }

  /**
   * Update table weight (placeholder for future implementation)
   */
  private updateTableWeight(tableName: string, weight: number): void {
    // This would update table weight in a future implementation
    // For now, just show a message
    this.showStatusMessage(`Weight for ${tableName} set to ${weight} (feature coming soon)`);
  }

  /**
   * Preview table contents
   */
  private previewTable(tableName: string): void {
    const tables = this.sparkTableManager.getTables();
    const table = tables[tableName];
    
    if (!table) return;

    const previewContent = `# ${table.name} Preview\n\n` +
      `**Entries:** ${table.entries.length}\n` +
      `**Source:** ${table.source}\n` +
      `**Last Modified:** ${new Date(table.lastModified).toLocaleString()}\n\n` +
      `**Sample Keywords:**\n` +
      table.entries.slice(0, 10).map(entry => `• ${entry}`).join('\n') +
      (table.entries.length > 10 ? `\n\n...and ${table.entries.length - 10} more` : '');

    // Show in new document
    vscode.workspace.openTextDocument({
      content: previewContent,
      language: 'markdown'
    }).then(doc => {
      vscode.window.showTextDocument(doc);
    });
  }

  /**
   * Bulk enable/disable all tables
   */
  private async bulkEnableDisable(enable: boolean): Promise<void> {
    const tables = this.sparkTableManager.getTables();
    const tableNames = Object.keys(tables);

    if (enable) {
      await ConfigurationService.updateOracleTables(tableNames);
      await ConfigurationService.updateSparksTables(tableNames);
    } else {
      await ConfigurationService.updateOracleTables(['default']); // Keep default enabled
      await ConfigurationService.updateSparksTables(['default']); // Keep default enabled
    }

    this.refreshTableData();
    this.showStatusMessage(`All tables ${enable ? 'enabled' : 'disabled'}`);
  }

  /**
   * Reset all table weights to 1
   */
  private resetWeights(): void {
    // Placeholder for future implementation
    this.showStatusMessage('Table weights reset (feature coming soon)');
  }

  /**
   * Show status message
   */
  private showStatusMessage(message: string): void {
    vscode.window.showInformationMessage(`Table Configuration: ${message}`);
  }

  /**
   * Generate the webview HTML content
   */
  private getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Spark Table Configuration</title>
    <style>
        :root {
          /* Responsive breakpoints */
          --mobile: 480px;
          --tablet: 768px;
          --desktop: 1024px;
          
          /* Touch target sizes */
          --touch-mobile: 48px;
          --touch-tablet: 44px;
          --touch-desktop: 40px;
          
          /* Spacing */
          --spacing-mobile: 16px;
          --spacing-tablet: 12px;
          --spacing-desktop: 8px;
        }

        * {
          box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: var(--spacing-desktop);
            margin: 0;
            min-width: 320px;
            line-height: 1.5;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-desktop);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: var(--spacing-desktop);
            flex-wrap: wrap;
            gap: var(--spacing-desktop);
        }
        
        .header h1 {
            margin: 0;
            font-size: 1.5rem;
            min-width: 0;
        }
        
        .actions {
            display: flex;
            gap: var(--spacing-desktop);
            flex-wrap: wrap;
        }
        
        .btn {
            min-width: var(--touch-desktop);
            min-height: var(--touch-desktop);
            padding: 8px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            touch-action: manipulation;
            transition: background-color 0.2s ease;
        }
        
        .btn:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn:focus {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .btn.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .table-grid {
            display: grid;
            gap: var(--spacing-desktop);
            margin-bottom: var(--spacing-desktop);
            grid-template-columns: 1fr;
        }
        
        .table-card {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: var(--spacing-desktop);
            background: var(--vscode-editor-background);
            transition: border-color 0.2s ease;
        }
        
        .table-card.enabled {
            border-left: 4px solid var(--vscode-progressBar-background);
        }
        
        .table-card.disabled {
            opacity: 0.7;
            border-left: 4px solid var(--vscode-descriptionForeground);
        }
        
        .table-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: var(--spacing-desktop);
            flex-wrap: wrap;
            gap: var(--spacing-desktop);
        }
        
        .table-title {
            font-weight: bold;
            font-size: 1.1rem;
            margin: 0;
            min-width: 0;
        }
        
        .table-stats {
            font-size: 0.85rem;
            color: var(--vscode-descriptionForeground);
            flex-shrink: 0;
        }
        
        .table-controls {
            display: flex;
            gap: var(--spacing-desktop);
            align-items: center;
            margin: var(--spacing-desktop) 0;
            flex-wrap: wrap;
        }
        
        .toggle-group {
            display: flex;
            gap: var(--spacing-desktop);
            align-items: center;
            flex-wrap: wrap;
        }
        
        .toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9rem;
            min-height: var(--touch-desktop);
            cursor: pointer;
        }
        
        .toggle input[type="checkbox"] {
            margin: 0;
            min-width: 16px;
            min-height: 16px;
            cursor: pointer;
        }
        
        .weight-control {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9rem;
            min-height: var(--touch-desktop);
        }
        
        .weight-slider {
            min-width: 80px;
            height: var(--touch-desktop);
            cursor: pointer;
        }
        
        .table-preview {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .preview-keywords {
            margin: 5px 0;
        }
        
        .summary {
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 15px;
            margin-top: 20px;
        }
        
        .summary h3 {
            margin: 0 0 10px 0;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--spacing-desktop);
            font-size: 0.9rem;
        }
        
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: var(--spacing-desktop) * 2;
            font-style: italic;
        }

        /* Mobile responsive styles */
        @media (max-width: 480px) {
            body {
                padding: var(--spacing-mobile);
            }
            
            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: var(--spacing-mobile);
            }
            
            .header h1 {
                font-size: 1.3rem;
            }
            
            .actions {
                width: 100%;
                justify-content: flex-start;
                gap: var(--spacing-mobile);
            }
            
            .btn {
                min-width: var(--touch-mobile);
                min-height: var(--touch-mobile);
                padding: 16px 20px;
                font-size: 16px; /* Prevent iOS zoom */
            }
            
            .table-grid {
                gap: var(--spacing-mobile);
            }
            
            .table-card {
                padding: var(--spacing-mobile);
            }
            
            .table-header {
                flex-direction: column;
                align-items: flex-start;
                gap: var(--spacing-mobile);
            }
            
            .table-controls {
                flex-direction: column;
                align-items: flex-start;
                gap: var(--spacing-mobile);
                width: 100%;
            }
            
            .toggle-group {
                width: 100%;
                flex-direction: column;
                align-items: flex-start;
                gap: var(--spacing-mobile);
            }
            
            .toggle {
                min-height: var(--touch-mobile);
                width: 100%;
                padding: 8px 0;
            }
            
            .toggle input[type="checkbox"] {
                min-width: 20px;
                min-height: 20px;
            }
            
            .weight-control {
                min-height: var(--touch-mobile);
                width: 100%;
                justify-content: space-between;
            }
            
            .weight-slider {
                min-width: 120px;
                height: var(--touch-mobile);
            }
            
            .summary-stats {
                grid-template-columns: 1fr;
                gap: var(--spacing-mobile);
            }
        }
        
        /* Tablet responsive styles */
        @media (min-width: 481px) and (max-width: 768px) {
            body {
                padding: var(--spacing-tablet);
            }
            
            .table-grid {
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: var(--spacing-tablet);
            }
            
            .btn {
                min-width: var(--touch-tablet);
                min-height: var(--touch-tablet);
                padding: 12px 16px;
                font-size: 15px;
            }
            
            .toggle {
                min-height: var(--touch-tablet);
            }
            
            .weight-slider {
                height: var(--touch-tablet);
            }
        }
        
        /* Desktop and larger */
        @media (min-width: 769px) {
            .table-grid {
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            }
        }
        
        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
            .table-title,
            .table-stats,
            .btn {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
        }
        
        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
            .btn {
                min-width: var(--touch-mobile);
                min-height: var(--touch-mobile);
            }
            
            .btn:hover {
                background: var(--vscode-button-background);
            }
            
            .toggle input[type="checkbox"] {
                min-width: 20px;
                min-height: 20px;
            }
        }
        
        /* Accessibility: Respect reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
            .btn,
            .table-card {
                transition: none;
            }
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Spark Table Configuration</h1>
        <div class="actions">
            <button class="btn secondary" onclick="refreshTables()">🔄 Refresh</button>
            <button class="btn secondary" onclick="enableAll()">Enable All</button>
            <button class="btn secondary" onclick="disableAll()">Disable All</button>
            <button class="btn secondary" onclick="resetWeights()">Reset Weights</button>
        </div>
    </div>
    
    <div id="content">
        <div class="loading">
            Loading table configuration...
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentTables = [];
        let currentConfiguration = {};

        // Request initial data
        refreshTables();

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateData':
                    currentTables = message.tables;
                    currentConfiguration = message.configuration;
                    renderTables();
                    break;
            }
        });

        function refreshTables() {
            vscode.postMessage({ type: 'refresh' });
        }

        function toggleTable(tableName, enabled, type) {
            vscode.postMessage({ 
                type: 'toggleTable', 
                tableName, 
                enabled, 
                type 
            });
        }

        function updateWeight(tableName, weight) {
            vscode.postMessage({ 
                type: 'updateWeight', 
                tableName, 
                weight: parseInt(weight)
            });
        }

        function previewTable(tableName) {
            vscode.postMessage({ 
                type: 'previewTable', 
                tableName 
            });
        }

        function enableAll() {
            vscode.postMessage({ type: 'bulkEnable' });
        }

        function disableAll() {
            vscode.postMessage({ type: 'bulkDisable' });
        }

        function resetWeights() {
            vscode.postMessage({ type: 'resetWeights' });
        }

        function renderTables() {
            const content = document.getElementById('content');
            
            if (currentTables.length === 0) {
                content.innerHTML = '<div class="empty-state">No tables found. Make sure you have .csv files in your .story-mode/spark-tables directory.</div>';
                return;
            }

            let html = '<div class="table-grid">';
            
            // Sort tables: default first, then alphabetically
            const sortedTables = [...currentTables].sort((a, b) => {
                if (a.isDefault) return -1;
                if (b.isDefault) return 1;
                return a.name.localeCompare(b.name);
            });
            
            for (const table of sortedTables) {
                const isEnabled = table.oracleConfigEnabled || table.sparksConfigEnabled;
                const lastUsedText = table.lastUsed ? 
                    new Date(table.lastUsed).toLocaleDateString() : 'Never used';
                const usageText = table.usageCount > 0 ? 
                    'Used ' + table.usageCount + ' time' + (table.usageCount !== 1 ? 's' : '') : 'Never used';
                const statusIcon = isEnabled ? '✅' : '❌';
                const defaultText = table.isDefault ? ' (Default)' : '';
                const sampleKeywords = table.entries.slice(0, 5).join(', ');
                const cardClass = isEnabled ? 'enabled' : 'disabled';
                const oracleChecked = table.oracleConfigEnabled ? 'checked' : '';
                const sparksChecked = table.sparksConfigEnabled ? 'checked' : '';
                const weightValue = table.weight || 1;
                    
                html += '<div class="table-card ' + cardClass + '">';
                html += '  <div class="table-header">';
                html += '    <div class="table-title">';
                html += '      ' + statusIcon + ' ' + table.name + defaultText;
                html += '    </div>';
                html += '    <div class="table-stats">';
                html += '      ' + table.entries.length + ' keywords';
                html += '    </div>';
                html += '  </div>';
                html += '  <div class="table-controls">';
                html += '    <div class="toggle-group">';
                html += '      <div class="toggle">';
                html += '        <input type="checkbox" id="oracle-' + table.name + '" ' + oracleChecked + ' onchange="toggleTable(\'' + table.name + '\', this.checked, \'oracle\')">';
                html += '        <label for="oracle-' + table.name + '">Oracle</label>';
                html += '      </div>';
                html += '      <div class="toggle">';
                html += '        <input type="checkbox" id="sparks-' + table.name + '" ' + sparksChecked + ' onchange="toggleTable(\'' + table.name + '\', this.checked, \'sparks\')">';
                html += '        <label for="sparks-' + table.name + '">Sparks</label>';
                html += '      </div>';
                html += '    </div>';
                html += '    <div class="weight-control">';
                html += '      <label>Weight:</label>';
                html += '      <input type="range" class="weight-slider" min="1" max="6" value="' + weightValue + '" onchange="updateWeight(\'' + table.name + '\', this.value)">';
                html += '      <span>' + weightValue + '</span>';
                html += '    </div>';
                html += '  </div>';
                html += '  <div class="table-preview">';
                html += '    <div>Last used: ' + lastUsedText + '</div>';
                html += '    <div>' + usageText + '</div>';
                html += '    <div class="preview-keywords">';
                html += '      Sample: ' + sampleKeywords + '...';
                html += '      <button class="btn secondary" onclick="previewTable(\'' + table.name + '\')">Preview</button>';
                html += '    </div>';
                html += '  </div>';
                html += '</div>';
            }
            
            html += '</div>';
            
            // Add summary section
            const oracleCount = currentTables.filter(t => t.oracleConfigEnabled).length;
            const sparksCount = currentTables.filter(t => t.sparksConfigEnabled).length;
            const totalOracleKeywords = currentTables
                .filter(t => t.oracleConfigEnabled)
                .reduce((sum, t) => sum + t.entries.length, 0);
            const totalSparksKeywords = currentTables
                .filter(t => t.sparksConfigEnabled)
                .reduce((sum, t) => sum + t.entries.length, 0);
            
            html += '<div class="summary">';
            html += '  <h3>📋 Current Selection Summary</h3>';
            html += '  <div class="summary-stats">';
            html += '    <div><strong>Oracle Tables:</strong> ' + oracleCount + ' tables (' + totalOracleKeywords + ' keywords)</div>';
            html += '    <div><strong>Sparks Tables:</strong> ' + sparksCount + ' tables (' + totalSparksKeywords + ' keywords)</div>';
            html += '    <div><strong>Keyword Count:</strong> ' + currentConfiguration.keywordCount + '</div>';
            html += '    <div><strong>Include Table Names:</strong> ' + (currentConfiguration.includeTableNames ? 'Yes' : 'No') + '</div>';
            html += '  </div>';
            html += '</div>';
            
            content.innerHTML = html;
        }
    </script>
</body>
</html>`;
  }
}