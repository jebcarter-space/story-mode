import * as vscode from 'vscode';
import { RepositoryManager } from '../services/repository-manager';
import { WorkbookService } from '../services/workbook-service';
import { LibraryService } from '../services/library-service';

export class StoryModeExplorer implements vscode.TreeDataProvider<StoryModeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<StoryModeItem | undefined | null | void> = new vscode.EventEmitter<StoryModeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<StoryModeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(
    private context: vscode.ExtensionContext,
    private repositoryManager: RepositoryManager,
    private workbookService: WorkbookService,
    private libraryService: LibraryService
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
        new StoryModeItem('Workbooks', vscode.TreeItemCollapsibleState.Collapsed, 'workbooks'),
        new StoryModeItem('Templates', vscode.TreeItemCollapsibleState.Collapsed, 'templates'),
        new StoryModeItem('LLM Profiles', vscode.TreeItemCollapsibleState.Collapsed, 'llm-profiles')
      ];
    }

    switch (element.contextValue) {
      case 'stories':
        return this.getStoryItems();
      case 'shelf':
        return this.getShelfItems(element.shelfId!);
      case 'book':
        return this.getBookItems(element.shelfId!, element.bookId!);
      case 'repository':
        return this.getRepositoryItems();
      case 'repository-category':
        return this.getRepositoryCategoryItems(element.category!);
      case 'workbooks':
        return this.getWorkbookItems();
      case 'workbook-stack':
        return this.getWorkbookStackItems(element.stackId!);
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
    
    try {
      const shelves = await this.libraryService.getShelves();
      
      if (shelves.length === 0) {
        items.push(new StoryModeItem('No shelves yet', vscode.TreeItemCollapsibleState.None, 'empty'));
      } else {
        for (const shelf of shelves) {
          const books = await this.libraryService.getBooks(shelf.id);
          const shelfLabel = `${shelf.name} (${books.length} book${books.length !== 1 ? 's' : ''})`;
          
          items.push(new StoryModeItem(
            shelfLabel,
            vscode.TreeItemCollapsibleState.Collapsed,
            'shelf',
            undefined,
            undefined,
            undefined,
            undefined,
            shelf.id
          ));
        }
      }
    } catch (error) {
      items.push(new StoryModeItem('No stories yet', vscode.TreeItemCollapsibleState.None, 'empty'));
    }

    return items;
  }

  private async getShelfItems(shelfId: string): Promise<StoryModeItem[]> {
    const items: StoryModeItem[] = [];
    
    try {
      const books = await this.libraryService.getBooks(shelfId);
      
      if (books.length === 0) {
        items.push(new StoryModeItem('No books yet', vscode.TreeItemCollapsibleState.None, 'empty'));
      } else {
        for (const book of books) {
          const chapters = await this.libraryService.getChapters(shelfId, book.id);
          const bookLabel = `${book.name} (${chapters.length} chapter${chapters.length !== 1 ? 's' : ''})`;
          
          items.push(new StoryModeItem(
            bookLabel,
            vscode.TreeItemCollapsibleState.Collapsed,
            'book',
            undefined,
            undefined,
            undefined,
            undefined,
            shelfId,
            book.id
          ));
        }
      }
    } catch (error) {
      items.push(new StoryModeItem('Error loading books', vscode.TreeItemCollapsibleState.None, 'error'));
    }

    return items;
  }

  private async getBookItems(shelfId: string, bookId: string): Promise<StoryModeItem[]> {
    const items: StoryModeItem[] = [];
    
    try {
      const chapters = await this.libraryService.getChapters(shelfId, bookId);
      
      if (chapters.length === 0) {
        items.push(new StoryModeItem('No chapters yet', vscode.TreeItemCollapsibleState.None, 'empty'));
      } else {
        for (const chapter of chapters) {
          const chapterItem = new StoryModeItem(
            chapter.name,
            vscode.TreeItemCollapsibleState.None,
            'chapter',
            undefined,
            undefined,
            undefined,
            undefined,
            shelfId,
            bookId,
            chapter.id
          );
          
          // Add click command to open chapter
          chapterItem.command = {
            command: 'story-mode.openChapter',
            title: 'Open Chapter',
            arguments: [chapterItem]
          };
          
          items.push(chapterItem);
        }
      }
    } catch (error) {
      items.push(new StoryModeItem('Error loading chapters', vscode.TreeItemCollapsibleState.None, 'error'));
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

  private async getWorkbookItems(): Promise<StoryModeItem[]> {
    const items: StoryModeItem[] = [];
    const workbookSystem = this.workbookService.getWorkbookSystem();
    
    // Add each stack as a collapsible item
    for (const stack of Object.values(workbookSystem.stacks)) {
      const workbookCount = Object.keys(stack.workbooks).length;
      const label = workbookCount > 0 ? `${stack.name} (${workbookCount})` : stack.name;
      
      items.push(new StoryModeItem(
        label,
        vscode.TreeItemCollapsibleState.Collapsed,
        'workbook-stack',
        undefined,
        undefined,
        stack.id
      ));
    }

    // If no stacks exist, show helper message
    if (items.length === 0) {
      items.push(new StoryModeItem(
        'No workbooks yet', 
        vscode.TreeItemCollapsibleState.None, 
        'empty'
      ));
    }

    return items;
  }

  private async getWorkbookStackItems(stackId: string): Promise<StoryModeItem[]> {
    const items: StoryModeItem[] = [];
    const workbookSystem = this.workbookService.getWorkbookSystem();
    const stack = workbookSystem.stacks[stackId];
    
    if (!stack) {
      return items;
    }

    // Add each workbook in this stack
    for (const workbook of Object.values(stack.workbooks)) {
      let label = workbook.name;
      
      // Add scope indicator if workbook has a master scope
      if (workbook.masterScope) {
        const scopeDisplay = this.workbookService.getScopeDisplayName(workbook.masterScope);
        label += ` [${scopeDisplay}]`;
      }
      
      // Add tags if present
      if (workbook.tags.length > 0) {
        label += ` (${workbook.tags.join(', ')})`;
      }

      items.push(new StoryModeItem(
        label,
        vscode.TreeItemCollapsibleState.None,
        'workbook',
        undefined,
        undefined,
        stackId,
        workbook.id
      ));
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
    public readonly resourceUri?: vscode.Uri,
    public readonly stackId?: string,
    public readonly workbookId?: string,
    public readonly shelfId?: string,
    public readonly bookId?: string,
    public readonly chapterId?: string
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
      case 'shelf':
        this.iconPath = new vscode.ThemeIcon('library');
        break;
      case 'book':
        this.iconPath = new vscode.ThemeIcon('book');
        break;
      case 'chapter':
        this.iconPath = new vscode.ThemeIcon('file-text');
        break;
      case 'repository':
        this.iconPath = new vscode.ThemeIcon('database');
        break;
      case 'workbooks':
        this.iconPath = new vscode.ThemeIcon('notebook');
        break;
      case 'workbook-stack':
        this.iconPath = new vscode.ThemeIcon('folder');
        break;
      case 'workbook':
        this.iconPath = new vscode.ThemeIcon('note');
        break;
      case 'templates':
        this.iconPath = new vscode.ThemeIcon('file-text');
        break;
      case 'llm-profiles':
        this.iconPath = new vscode.ThemeIcon('settings-gear');
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
