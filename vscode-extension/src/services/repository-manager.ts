import * as vscode from 'vscode';
import { parse } from 'yaml';
import type { RepositoryItem, RepositoryContext, ResolvedRepositoryItem } from '../types';

export class RepositoryManager {
  constructor(private context: vscode.ExtensionContext) {}

  async getContextForFile(fileUri: vscode.Uri): Promise<RepositoryContext> {
    // Extract context from file path and frontmatter
    const filePath = fileUri.fsPath;
    const context: RepositoryContext = { filePath };

    try {
      // Try to read file and parse frontmatter
      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      const text = fileContent.toString();
      
      if (text.startsWith('---')) {
        const endOfFrontmatter = text.indexOf('---', 3);
        if (endOfFrontmatter > 0) {
          const frontmatter = text.slice(3, endOfFrontmatter);
          const metadata = parse(frontmatter);
          
          if (metadata.shelf) context.shelfId = metadata.shelf;
          if (metadata.book) context.bookId = metadata.book;  
          if (metadata.chapter) context.chapterId = metadata.chapter;
        }
      }

      // Extract from file path structure if not in frontmatter
      const pathParts = filePath.split('/');
      const storyModeIndex = pathParts.findIndex(part => part === '.story-mode');
      
      if (storyModeIndex >= 0) {
        // Look for shelves/shelf-name/books/book-name pattern
        const shelvesIndex = pathParts.indexOf('shelves', storyModeIndex);
        if (shelvesIndex >= 0 && pathParts.length > shelvesIndex + 1) {
          if (!context.shelfId) context.shelfId = pathParts[shelvesIndex + 1];
          
          const booksIndex = pathParts.indexOf('books', shelvesIndex);
          if (booksIndex >= 0 && pathParts.length > booksIndex + 1) {
            if (!context.bookId) context.bookId = pathParts[booksIndex + 1];
          }
        }
      }
      
    } catch (error) {
      console.warn('Could not parse file for repository context:', error);
    }

    return context;
  }

  async getRelevantItems(text: string, context: RepositoryContext): Promise<RepositoryItem[]> {
    const allItems = await this.getAllRepositoryItems();
    const relevant: RepositoryItem[] = [];

    // Add force-in-context items that are in scope
    const forcedItems = allItems.filter(item => 
      item.forceInContext && this.isItemInScope(item, context)
    );
    relevant.push(...forcedItems);

    // Add keyword-matched items
    const textLower = text.toLowerCase();
    for (const item of allItems) {
      if (relevant.includes(item)) continue; // Already added as forced
      
      if (this.isItemInScope(item, context)) {
        // Check if any keywords match
        const hasKeywordMatch = item.keywords.some(keyword => 
          textLower.includes(keyword.toLowerCase())
        );
        
        if (hasKeywordMatch) {
          relevant.push(item);
        }
      }
    }

    return relevant;
  }

  private async getAllRepositoryItems(): Promise<RepositoryItem[]> {
    const items: RepositoryItem[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return items;

    const repoRoot = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'repositories');
    const categories = ['characters', 'locations', 'objects', 'situations'];

    try {
      for (const category of categories) {
        const categoryPath = vscode.Uri.joinPath(repoRoot, category);
        
        try {
          const files = await vscode.workspace.fs.readDirectory(categoryPath);
          
          for (const [fileName, fileType] of files) {
            if (fileType === vscode.FileType.File && fileName.endsWith('.md')) {
              const item = await this.loadRepositoryItem(
                vscode.Uri.joinPath(categoryPath, fileName),
                category as any
              );
              if (item) items.push(item);
            }
          }
        } catch (error) {
          // Category folder doesn't exist, skip
        }
      }
    } catch (error) {
      console.warn('Failed to load repository items:', error);
    }

    return items;
  }

  private async loadRepositoryItem(fileUri: vscode.Uri, defaultCategory: string): Promise<RepositoryItem | null> {
    try {
      const content = await vscode.workspace.fs.readFile(fileUri);
      const text = content.toString();
      
      if (!text.startsWith('---')) {
        return null; // Not a valid repository item
      }

      const endOfFrontmatter = text.indexOf('---', 3);
      if (endOfFrontmatter === -1) return null;

      const frontmatter = text.slice(3, endOfFrontmatter);
      const bodyContent = text.slice(endOfFrontmatter + 3).trim();
      
      const metadata = parse(frontmatter);
      
      const item: RepositoryItem = {
        name: metadata.name || this.extractNameFromPath(fileUri.fsPath),
        description: metadata.description || '',
        keywords: metadata.tags || metadata.keywords || [],
        content: bodyContent,
        forceInContext: metadata.forceContext || false,
        category: metadata.type || defaultCategory,
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

  private extractNameFromPath(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private isItemInScope(item: RepositoryItem, context: RepositoryContext): boolean {
    switch (item.scope) {
      case 'library':
        return true; // Always in scope
      
      case 'shelf':
        return context.shelfId === item.scopeContext.shelfId;
      
      case 'book':
        return context.shelfId === item.scopeContext.shelfId && 
               context.bookId === item.scopeContext.bookId;
      
      case 'chapter':
        return context.shelfId === item.scopeContext.shelfId &&
               context.bookId === item.scopeContext.bookId &&
               context.chapterId === item.scopeContext.chapterId;
      
      default:
        return true;
    }
  }

  async openRepositoryPanel(): Promise<void> {
    // Create and show webview panel for repository management
    const panel = vscode.window.createWebviewPanel(
      'storyModeRepository',
      'Story Mode Repository',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getRepositoryWebviewContent();

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'loadItems':
          const items = await this.getAllRepositoryItems();
          panel.webview.postMessage({ command: 'itemsLoaded', items });
          break;
        
        case 'createItem':
          await this.createRepositoryItem(message.item);
          break;
      }
    });

    // Send initial data
    const items = await this.getAllRepositoryItems();
    panel.webview.postMessage({ command: 'itemsLoaded', items });
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
            border-radius: 3px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <h1>Repository Manager</h1>
    <button onclick="createNew()">Create New Item</button>
    <div id="items"></div>

    <script>
        const vscode = acquireVsCodeApi();
        
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'itemsLoaded') {
                displayItems(message.items);
            }
        });

        function displayItems(items) {
            const container = document.getElementById('items');
            container.innerHTML = items.map(item => \`
                <div class="item">
                    <div class="category">[\${item.category}] \${item.name}</div>
                    <div>\${item.description || item.content.slice(0, 100)}...</div>
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
