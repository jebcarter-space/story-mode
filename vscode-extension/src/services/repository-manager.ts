import * as vscode from 'vscode';
import { parse } from 'yaml';
import { ContextResolver } from '../lib/context-resolver';
import type { RepositoryItem, RepositoryContext, ResolvedRepositoryItem, RepositoryCategory } from '../types';

export class RepositoryManager {
  private contextResolver: ContextResolver;
  private contextService: any = null; // Will be set later
  private repositoryCache = new Map<string, RepositoryItem>();
  private cacheLastUpdated = 0;
  
  constructor(private context: vscode.ExtensionContext) {
    this.contextResolver = new ContextResolver();
  }

  /**
   * Set the context service for enhanced context management
   */
  setContextService(contextService: any): void {
    this.contextService = contextService;
  }

  async getContextForFile(fileUri: vscode.Uri): Promise<RepositoryContext> {
    // Use context service if available, otherwise fallback to context resolver
    if (this.contextService) {
      return this.contextService.getCurrentContext(fileUri);
    }
    return this.contextResolver.resolveContext(fileUri);
  }

  /**
   * Refresh repository cache from filesystem
   */
  async refreshRepository(): Promise<void> {
    this.repositoryCache.clear();
    await this.loadAllRepositoryItems();
    this.cacheLastUpdated = Date.now();
  }

  /**
   * Get all repository items that are relevant for the current context
   */
  async getRelevantItems(text: string, context: RepositoryContext): Promise<RepositoryItem[]> {
    // Ensure cache is fresh
    if (this.repositoryCache.size === 0 || this.shouldRefreshCache()) {
      await this.refreshRepository();
    }

    const relevantItems: RepositoryItem[] = [];
    const keywords = this.extractKeywords(text);

    for (const [key, item] of this.repositoryCache) {
      // Include forced items if they're in scope
      if (item.forceInContext && this.contextResolver.isContextCompatible(item.scopeContext, context)) {
        relevantItems.push(item);
        continue;
      }

      // Include items that match keywords and are in scope
      if (this.itemMatchesKeywords(item, keywords) && this.isItemInScope(item, context)) {
        relevantItems.push(item);
      }
    }

    return relevantItems;
  }

  /**
   * Get items by category for tree view
   */
  async getItemsByCategory(category: string): Promise<RepositoryItem[]> {
    if (this.repositoryCache.size === 0 || this.shouldRefreshCache()) {
      await this.refreshRepository();
    }

    const items: RepositoryItem[] = [];
    const categoryEnum = this.getCategoryFromName(category);
    
    for (const [key, item] of this.repositoryCache) {
      if (item.category === categoryEnum) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Get repositories by category as a key-value object for template placeholders
   */
  async getRepositoriesByCategory(category: RepositoryCategory): Promise<Record<string, RepositoryItem>> {
    if (this.repositoryCache.size === 0 || this.shouldRefreshCache()) {
      await this.refreshRepository();
    }

    const repositories: Record<string, RepositoryItem> = {};
    
    for (const [key, item] of this.repositoryCache) {
      if (item.category === category) {
        repositories[key] = item;
      }
    }

    return repositories;
  }

  /**
   * Load all repository items from filesystem
   */
  private async loadAllRepositoryItems(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const repositoriesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'repositories');
    
    try {
      const categories = await vscode.workspace.fs.readDirectory(repositoriesPath);
      
      for (const [categoryName, fileType] of categories) {
        if (fileType === vscode.FileType.Directory && categoryName !== 'metadata.json') {
          const categoryPath = vscode.Uri.joinPath(repositoriesPath, categoryName);
          await this.loadCategoryItems(categoryPath, this.getCategoryFromName(categoryName));
        }
      }
    } catch (error) {
      console.warn('Failed to load repository items:', error);
    }
  }

  /**
   * Load items from a specific category directory
   */
  private async loadCategoryItems(categoryPath: vscode.Uri, category: RepositoryCategory): Promise<void> {
    try {
      const files = await vscode.workspace.fs.readDirectory(categoryPath);
      
      for (const [fileName, fileType] of files) {
        if (fileType === vscode.FileType.File && fileName.endsWith('.md')) {
          const filePath = vscode.Uri.joinPath(categoryPath, fileName);
          const item = await this.loadRepositoryItemFromFile(filePath, category);
          if (item) {
            const key = `${category}/${fileName}`;
            this.repositoryCache.set(key, item);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to load items from category ${category}:`, error);
    }
  }

  /**
   * Load a repository item from a markdown file with frontmatter
   */
  private async loadRepositoryItemFromFile(fileUri: vscode.Uri, category: RepositoryCategory): Promise<RepositoryItem | null> {
    try {
      const content = await vscode.workspace.fs.readFile(fileUri);
      const text = Buffer.from(content).toString('utf8');
      
      // Parse frontmatter and content
      const frontmatterMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
      if (!frontmatterMatch) {
        console.warn(`No frontmatter found in ${fileUri.fsPath}`);
        return null;
      }
      
      const metadata = parse(frontmatterMatch[1]);
      const content_text = frontmatterMatch[2];
      
      // Extract name from content (first # header)
      const nameMatch = content_text.match(/^#\s+(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : this.extractNameFromPath(fileUri.fsPath);
      
      const item: RepositoryItem = {
        name,
        description: metadata.description || '',
        keywords: metadata.tags || [],
        content: content_text,
        forceInContext: metadata.forceContext === true,
        category,
        created: metadata.created || Date.now(),
        updated: metadata.updated || Date.now(),
        scope: metadata.scope || 'library',
        scopeContext: metadata.scopeContext || {},
        workbookTags: metadata.workbookTags || [],
        llmProfile: metadata.llmProfile || ''
      };

      return item;
    } catch (error) {
      console.warn(`Failed to load repository item ${fileUri.fsPath}:`, error);
      return null;
    }
  }

  /**
   * Helper methods
   */
  private shouldRefreshCache(): boolean {
    const CACHE_TTL = 30000; // 30 seconds
    return Date.now() - this.cacheLastUpdated > CACHE_TTL;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - can be enhanced
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    return [...new Set(words)]; // Remove duplicates
  }

  private itemMatchesKeywords(item: RepositoryItem, keywords: string[]): boolean {
    return item.keywords.some(itemKeyword => 
      keywords.some(keyword => 
        keyword.toLowerCase() === itemKeyword.toLowerCase()
      )
    );
  }

  private getCategoryFromName(categoryName: string): RepositoryCategory {
    const mapping: Record<string, RepositoryCategory> = {
      'characters': 'Character',
      'locations': 'Location', 
      'objects': 'Object',
      'situations': 'Situation'
    };
    return mapping[categoryName] || 'Character';
  }

  private extractNameFromPath(filePath: string): string {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    return fileName.replace(/\.md$/, '').replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private isItemInScope(item: RepositoryItem, context: RepositoryContext): boolean {
    // Library-scoped items are always in scope
    if (item.scope === 'library') return true;

    // Check if the item's scope context matches current context
    return this.contextResolver.isContextCompatible(item.scopeContext, context);
  }

  async openRepositoryPanel(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'storyModeRepository',
      'Story Mode Repository',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getRepositoryWebviewContent();

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async message => {
      switch (message.command) {
        case 'loadItems':
          const items = await this.getAllRepositoryItems();
          panel.webview.postMessage({ command: 'showItems', items });
          break;
        case 'createItem':
          await this.createRepositoryItem(message.item);
          // Refresh items
          const refreshedItems = await this.getAllRepositoryItems();
          panel.webview.postMessage({ command: 'showItems', items: refreshedItems });
          break;
        case 'updateItem':
          await this.updateRepositoryItem(message.originalName, message.item);
          const updatedItems = await this.getAllRepositoryItems();
          panel.webview.postMessage({ command: 'showItems', items: updatedItems });
          break;
        case 'deleteItem':
          await this.deleteRepositoryItem(message.name);
          const remainingItems = await this.getAllRepositoryItems();
          panel.webview.postMessage({ command: 'showItems', items: remainingItems });
          break;
        case 'exportItems':
          await this.exportRepositoryItems();
          break;
        case 'importItems':
          await this.importRepositoryItems();
          break;
      }
    });
  }

  private async createRepositoryItem(itemData: Partial<RepositoryItem>): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || !itemData.name || !itemData.category) return;

    const categoryPath = vscode.Uri.joinPath(
      workspaceFolders[0].uri, 
      '.story-mode', 
      'repositories', 
      itemData.category.toLowerCase() + 's'
    );

    const fileName = itemData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.md';
    const filePath = vscode.Uri.joinPath(categoryPath, fileName);

    const frontmatter = {
      type: itemData.category?.toLowerCase(),
      tags: itemData.keywords || [],
      scope: itemData.scope || 'library',
      forceContext: itemData.forceInContext || false,
      llmProfile: itemData.llmProfile || ''
    };

    const content = `---\n${Object.entries(frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n# ${itemData.name}\n\n${itemData.content || 'Add description here...'}`;

    await vscode.workspace.fs.writeFile(filePath, new TextEncoder().encode(content));
    
    // Refresh cache
    await this.refreshRepository();
  }

  private async updateRepositoryItem(originalName: string, itemData: Partial<RepositoryItem>): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || !itemData.name || !itemData.category) return;

    // Find the original file
    const originalFileName = originalName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.md';
    const categoryPath = vscode.Uri.joinPath(
      workspaceFolders[0].uri, 
      '.story-mode', 
      'repositories', 
      itemData.category.toLowerCase() + 's'
    );
    const originalFilePath = vscode.Uri.joinPath(categoryPath, originalFileName);

    // Create new file name if name changed
    const newFileName = itemData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.md';
    const newFilePath = vscode.Uri.joinPath(categoryPath, newFileName);

    const frontmatter = {
      type: itemData.category?.toLowerCase(),
      tags: itemData.keywords || [],
      scope: itemData.scope || 'library',
      forceContext: itemData.forceInContext || false,
      llmProfile: itemData.llmProfile || ''
    };

    const content = `---\n${Object.entries(frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n# ${itemData.name}\n\n${itemData.content || itemData.description || 'Add description here...'}`;

    // Write to new location
    await vscode.workspace.fs.writeFile(newFilePath, new TextEncoder().encode(content));

    // Delete original file if name changed
    if (originalFileName !== newFileName) {
      try {
        await vscode.workspace.fs.delete(originalFilePath);
      } catch (error) {
        // Ignore if original file doesn't exist
      }
    }

    // Refresh cache
    await this.refreshRepository();
  }

  private async deleteRepositoryItem(itemName: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    // Find the item to get its category
    const item = Array.from(this.repositoryCache.values()).find(i => i.name === itemName);
    if (!item) return;

    const fileName = itemName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.md';
    const categoryPath = vscode.Uri.joinPath(
      workspaceFolders[0].uri, 
      '.story-mode', 
      'repositories', 
      item.category.toLowerCase() + 's'
    );
    const filePath = vscode.Uri.joinPath(categoryPath, fileName);

    try {
      await vscode.workspace.fs.delete(filePath);
      // Refresh cache
      await this.refreshRepository();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete item: ${error}`);
    }
  }

  private async exportRepositoryItems(): Promise<void> {
    const items = await this.getAllRepositoryItems();
    const exportData = {
      exportDate: new Date().toISOString(),
      items: items.map(item => ({
        name: item.name,
        category: item.category,
        description: item.description,
        content: item.content,
        keywords: item.keywords,
        scope: item.scope,
        forceInContext: item.forceInContext
      }))
    };

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('story-mode-repository-export.json'),
      filters: {
        'JSON Files': ['json']
      }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(
        uri, 
        new TextEncoder().encode(JSON.stringify(exportData, null, 2))
      );
      vscode.window.showInformationMessage(`Exported ${items.length} items to ${uri.fsPath}`);
    }
  }

  private async importRepositoryItems(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json']
      }
    });

    if (!uris || uris.length === 0) return;

    try {
      const content = await vscode.workspace.fs.readFile(uris[0]);
      const data = JSON.parse(new TextDecoder().decode(content));
      
      if (!data.items || !Array.isArray(data.items)) {
        vscode.window.showErrorMessage('Invalid import file format');
        return;
      }

      let importCount = 0;
      for (const item of data.items) {
        if (item.name && item.category) {
          await this.createRepositoryItem(item);
          importCount++;
        }
      }

      vscode.window.showInformationMessage(`Imported ${importCount} items successfully`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import items: ${error}`);
    }
  }

  private async getAllRepositoryItems(): Promise<RepositoryItem[]> {
    if (this.repositoryCache.size === 0 || this.shouldRefreshCache()) {
      await this.refreshRepository();
    }

    return Array.from(this.repositoryCache.values());
  }

  private getRepositoryWebviewContent(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Repository Manager</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px;
            color: var(--vscode-foreground);
        }
        .item { 
            border: 1px solid var(--vscode-panel-border); 
            margin: 10px 0; 
            padding: 15px; 
            border-radius: 5px;
        }
        .category { font-weight: bold; color: var(--vscode-textLink-foreground); }
        .keywords { font-size: 0.9em; color: var(--vscode-descriptionForeground); }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <h1>Repository Items</h1>
    <button onclick="createNew()">Create New Item</button>
    <div id="items"></div>

    <script>
        const vscode = acquireVsCodeApi();
        
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'showItems') {
                displayItems(message.items);
            }
        });

        function displayItems(items) {
            const container = document.getElementById('items');
            container.innerHTML = items.map(item => \`
                <div class="item">
                    <div class="category">\${item.category}: \${item.name}</div>
                    <div>\${item.description}</div>
                    <div class="keywords">Keywords: \${item.keywords.join(', ')}</div>
                    <div style="font-size: 0.8em; color: var(--vscode-descriptionForeground);">
                        Scope: \${item.scope} | Force in context: \${item.forceInContext}
                    </div>
                </div>
            \`).join('');
        }

        function createNew() {
            const name = prompt('Item name:');
            if (!name) return;
            
            const category = prompt('Category (Character/Location/Object/Situation):');
            if (!category) return;
            
            vscode.postMessage({
                command: 'createItem',
                item: { name, category }
            });
        }

        // Load items on startup
        vscode.postMessage({ command: 'loadItems' });
    </script>
</body>
</html>`;
  }
}