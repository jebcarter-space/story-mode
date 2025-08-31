import * as vscode from 'vscode';
import { RepositoryManager } from '../services/repository-manager';

export class StoryModeExplorer implements vscode.TreeDataProvider<StoryModeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<StoryModeItem | undefined | null | void> = new vscode.EventEmitter<StoryModeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<StoryModeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(
    private context: vscode.ExtensionContext,
    private repositoryManager: RepositoryManager
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: StoryModeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: StoryModeItem): Promise<StoryModeItem[]> {
    if (!element) {
      // Root level items
      return [
        new StoryModeItem('Stories', vscode.TreeItemCollapsibleState.Collapsed, 'stories'),
        new StoryModeItem('Repository', vscode.TreeItemCollapsibleState.Collapsed, 'repository'),
        new StoryModeItem('Templates', vscode.TreeItemCollapsibleState.Collapsed, 'templates'),
        new StoryModeItem('LLM Profiles', vscode.TreeItemCollapsibleState.Collapsed, 'llm-profiles')
      ];
    }

    switch (element.contextValue) {
      case 'stories':
        return this.getStoryItems();
      case 'repository':
        return this.getRepositoryItems();
      case 'repository-category':
        return this.getRepositoryCategoryItems(element.category!);
      case 'templates':
        return this.getTemplateItems();
      case 'llm-profiles':
        return this.getLLMProfileItems();
      default:
        return [];
    }
  }

  private async getStoryItems(): Promise<StoryModeItem[]> {
    const items: StoryModeItem[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return items;

    try {
      const shelvesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'shelves');
      const shelves = await vscode.workspace.fs.readDirectory(shelvesPath);
      
      for (const [shelfName, fileType] of shelves) {
        if (fileType === vscode.FileType.Directory) {
          items.push(new StoryModeItem(
            shelfName,
            vscode.TreeItemCollapsibleState.Collapsed,
            'shelf',
            undefined,
            vscode.Uri.joinPath(shelvesPath, shelfName)
          ));
        }
      }
    } catch (error) {
      // No stories yet
      items.push(new StoryModeItem('No stories yet', vscode.TreeItemCollapsibleState.None, 'empty'));
    }

    return items;
  }

  private async getRepositoryItems(): Promise<StoryModeItem[]> {
    const items: StoryModeItem[] = [];
    const categories = ['characters', 'locations', 'objects', 'situations'];
    
    for (const category of categories) {
      const categoryItems = await this.repositoryManager.getItemsByCategory(category);
      const categoryLabel = `${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryItems.length})`;
      
      const categoryItem = new StoryModeItem(
        categoryLabel,
        categoryItems.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        'repository-category',
        category
      );
      
      items.push(categoryItem);
    }
    
    return items;
  }

  private async getRepositoryCategoryItems(category: string): Promise<StoryModeItem[]> {
    const items: StoryModeItem[] = [];
    const repositoryItems = await this.repositoryManager.getItemsByCategory(category);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders) return items;
    
    for (const item of repositoryItems) {
      const fileName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.md';
      const filePath = vscode.Uri.joinPath(
        workspaceFolders[0].uri, 
        '.story-mode', 
        'repositories', 
        category,
        fileName
      );
      
      const treeItem = new StoryModeItem(
        item.name,
        vscode.TreeItemCollapsibleState.None,
        'repository-item',
        category,
        filePath
      );
      
      // Add tooltip with item details
      treeItem.tooltip = `${item.description}\nKeywords: ${item.keywords.join(', ')}\nScope: ${item.scope}`;
      
      // Add context indicators
      if (item.forceInContext) {
        treeItem.description = '⭐ Force in context';
      } else if (item.scope !== 'library') {
        treeItem.description = `📍 ${item.scope}`;
      }
      
      items.push(treeItem);
    }
    
    return items;
  }

  private async getTemplateItems(): Promise<StoryModeItem[]> {
    const items: StoryModeItem[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return items;

    try {
      const templatesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'templates');
      const files = await vscode.workspace.fs.readDirectory(templatesPath);
      
      for (const [fileName, fileType] of files) {
        if (fileType === vscode.FileType.File && fileName.endsWith('.md')) {
          const name = fileName.replace('.md', '');
          items.push(new StoryModeItem(
            name,
            vscode.TreeItemCollapsibleState.None,
            'template',
            undefined,
            vscode.Uri.joinPath(templatesPath, fileName)
          ));
        }
      }
    } catch (error) {
      items.push(new StoryModeItem('No templates yet', vscode.TreeItemCollapsibleState.None, 'empty'));
    }

    return items;
  }

  private async getLLMProfileItems(): Promise<StoryModeItem[]> {
    const items: StoryModeItem[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return items;

    try {
      const profilesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'llm-profiles');
      const files = await vscode.workspace.fs.readDirectory(profilesPath);
      
      for (const [fileName, fileType] of files) {
        if (fileType === vscode.FileType.File && fileName.endsWith('.json')) {
          const name = fileName.replace('.json', '');
          items.push(new StoryModeItem(
            name,
            vscode.TreeItemCollapsibleState.None,
            'llm-profile',
            undefined,
            vscode.Uri.joinPath(profilesPath, fileName)
          ));
        }
      }
    } catch (error) {
      items.push(new StoryModeItem('No LLM profiles yet', vscode.TreeItemCollapsibleState.None, 'empty'));
    }

    return items;
  }
}

class StoryModeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly category?: string,
    public readonly resourceUri?: vscode.Uri
  ) {
    super(label, collapsibleState);
    
    if (resourceUri) {
      this.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [resourceUri]
      };
    }

    // Set icons based on context
    switch (contextValue) {
      case 'stories':
        this.iconPath = new vscode.ThemeIcon('book');
        break;
      case 'repository':
        this.iconPath = new vscode.ThemeIcon('database');
        break;
      case 'templates':
        this.iconPath = new vscode.ThemeIcon('file-text');
        break;
      case 'llm-profiles':
        this.iconPath = new vscode.ThemeIcon('settings-gear');
        break;
      case 'shelf':
        this.iconPath = new vscode.ThemeIcon('folder');
        break;
      case 'repository-category':
        this.iconPath = new vscode.ThemeIcon('symbol-class');
        break;
      case 'repository-item':
        this.iconPath = new vscode.ThemeIcon('file-text');
        break;
      case 'template':
        this.iconPath = new vscode.ThemeIcon('file');
        break;
      case 'llm-profile':
        this.iconPath = new vscode.ThemeIcon('gear');
        break;
    }
  }
}
