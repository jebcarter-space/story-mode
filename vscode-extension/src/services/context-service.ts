import * as vscode from 'vscode';
import { ContextResolver } from '../lib/context-resolver';
import type { RepositoryContext } from '../types';

/**
 * Service for managing repository context state and overrides
 */
export class ContextService {
  private contextResolver: ContextResolver;
  private manualContext: RepositoryContext | null = null;
  private readonly _onDidChangeContext = new vscode.EventEmitter<RepositoryContext>();
  readonly onDidChangeContext = this._onDidChangeContext.event;

  constructor(private extensionContext: vscode.ExtensionContext) {
    this.contextResolver = new ContextResolver();
  }

  /**
   * Get the current effective context (manual override or auto-detected)
   */
  async getCurrentContext(fileUri?: vscode.Uri): Promise<RepositoryContext> {
    // If manual override is set, use it
    if (this.manualContext) {
      return this.manualContext;
    }

    // Otherwise, auto-detect from current file or active editor
    const targetUri = fileUri || vscode.window.activeTextEditor?.document.uri;
    if (targetUri) {
      return this.contextResolver.resolveContext(targetUri);
    }

    // Fallback to library-level context
    return {};
  }

  /**
   * Set manual context override
   */
  async setContextOverride(context: RepositoryContext): Promise<void> {
    this.manualContext = context;
    this._onDidChangeContext.fire(context);
    
    // Show confirmation message
    const description = this.contextResolver.getContextDescription(context);
    vscode.window.showInformationMessage(`Context set to: ${description}`);
  }

  /**
   * Clear manual context override (return to auto-detection)
   */
  async clearContextOverride(): Promise<void> {
    this.manualContext = null;
    const currentContext = await this.getCurrentContext();
    this._onDidChangeContext.fire(currentContext);
    vscode.window.showInformationMessage('Context override cleared - using auto-detection');
  }

  /**
   * Show context selection UI
   */
  async showContextPicker(): Promise<void> {
    const items: vscode.QuickPickItem[] = [
      {
        label: '$(library) Library (Global)',
        description: 'All stories and repository items',
        detail: 'library'
      },
      {
        label: '$(folder) Select Shelf...',
        description: 'Choose a specific shelf/series',
        detail: 'shelf-picker'
      },
      {
        label: '$(book) Select Book...',
        description: 'Choose a specific book/story',
        detail: 'book-picker'
      },
      {
        label: '$(file-text) Select Chapter...',
        description: 'Choose a specific chapter',
        detail: 'chapter-picker'
      },
      {
        label: '$(x) Clear Override',
        description: 'Return to automatic context detection',
        detail: 'clear'
      }
    ];

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select context scope...',
      ignoreFocusOut: false
    });

    if (!selection) return;

    switch (selection.detail) {
      case 'library':
        await this.setContextOverride({});
        break;
      case 'shelf-picker':
        await this.showShelfPicker();
        break;
      case 'book-picker':
        await this.showBookPicker();
        break;
      case 'chapter-picker':
        await this.showChapterPicker();
        break;
      case 'clear':
        await this.clearContextOverride();
        break;
    }
  }

  /**
   * Show shelf selection UI
   */
  private async showShelfPicker(): Promise<void> {
    const shelves = await this.getAvailableShelves();
    
    if (shelves.length === 0) {
      vscode.window.showWarningMessage('No shelves found in the current workspace');
      return;
    }

    const items = shelves.map(shelf => ({
      label: `$(folder) ${shelf}`,
      description: 'Shelf',
      detail: shelf
    }));

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a shelf...',
      ignoreFocusOut: false
    });

    if (selection) {
      await this.setContextOverride({ shelfId: selection.detail });
    }
  }

  /**
   * Show book selection UI
   */
  private async showBookPicker(): Promise<void> {
    const books = await this.getAvailableBooks();
    
    if (books.length === 0) {
      vscode.window.showWarningMessage('No books found in the current workspace');
      return;
    }

    const items = books.map(book => ({
      label: `$(book) ${book.name}`,
      description: book.shelf ? `Shelf: ${book.shelf}` : 'Book',
      detail: JSON.stringify(book.context)
    }));

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a book...',
      ignoreFocusOut: false
    });

    if (selection) {
      await this.setContextOverride(JSON.parse(selection.detail));
    }
  }

  /**
   * Show chapter selection UI
   */
  private async showChapterPicker(): Promise<void> {
    const chapters = await this.getAvailableChapters();
    
    if (chapters.length === 0) {
      vscode.window.showWarningMessage('No chapters found in the current workspace');
      return;
    }

    const items = chapters.map(chapter => ({
      label: `$(file-text) ${chapter.name}`,
      description: `${chapter.book} ${chapter.shelf ? `(${chapter.shelf})` : ''}`,
      detail: JSON.stringify(chapter.context)
    }));

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a chapter...',
      ignoreFocusOut: false
    });

    if (selection) {
      await this.setContextOverride(JSON.parse(selection.detail));
    }
  }

  /**
   * Get available shelves from workspace
   */
  private async getAvailableShelves(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    const shelvesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'shelves');
    
    try {
      const entries = await vscode.workspace.fs.readDirectory(shelvesPath);
      return entries
        .filter(([name, type]) => type === vscode.FileType.Directory)
        .map(([name]) => name);
    } catch {
      return [];
    }
  }

  /**
   * Get available books from workspace
   */
  private async getAvailableBooks(): Promise<Array<{name: string, shelf?: string, context: RepositoryContext}>> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    const books: Array<{name: string, shelf?: string, context: RepositoryContext}> = [];
    const shelvesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'shelves');
    
    try {
      const shelves = await vscode.workspace.fs.readDirectory(shelvesPath);
      
      for (const [shelfName, shelfType] of shelves) {
        if (shelfType !== vscode.FileType.Directory) continue;
        
        const booksPath = vscode.Uri.joinPath(shelvesPath, shelfName, 'books');
        try {
          const bookEntries = await vscode.workspace.fs.readDirectory(booksPath);
          for (const [bookName, bookType] of bookEntries) {
            if (bookType === vscode.FileType.Directory) {
              books.push({
                name: bookName,
                shelf: shelfName,
                context: { shelfId: shelfName, bookId: bookName }
              });
            }
          }
        } catch {
          // Books directory might not exist
        }
      }
    } catch {
      // Shelves directory might not exist
    }

    return books;
  }

  /**
   * Get available chapters from workspace
   */
  private async getAvailableChapters(): Promise<Array<{name: string, book: string, shelf?: string, context: RepositoryContext}>> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    const chapters: Array<{name: string, book: string, shelf?: string, context: RepositoryContext}> = [];
    const shelvesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'shelves');
    
    try {
      const shelves = await vscode.workspace.fs.readDirectory(shelvesPath);
      
      for (const [shelfName, shelfType] of shelves) {
        if (shelfType !== vscode.FileType.Directory) continue;
        
        const booksPath = vscode.Uri.joinPath(shelvesPath, shelfName, 'books');
        try {
          const books = await vscode.workspace.fs.readDirectory(booksPath);
          
          for (const [bookName, bookType] of books) {
            if (bookType !== vscode.FileType.Directory) continue;
            
            const chaptersPath = vscode.Uri.joinPath(booksPath, bookName, 'chapters');
            try {
              const chapterEntries = await vscode.workspace.fs.readDirectory(chaptersPath);
              for (const [chapterFile, chapterType] of chapterEntries) {
                if (chapterType === vscode.FileType.File && chapterFile.endsWith('.md')) {
                  const chapterName = chapterFile.replace(/\.md$/, '');
                  chapters.push({
                    name: chapterName,
                    book: bookName,
                    shelf: shelfName,
                    context: { shelfId: shelfName, bookId: bookName, chapterId: chapterName }
                  });
                }
              }
            } catch {
              // Chapters directory might not exist
            }
          }
        } catch {
          // Books directory might not exist
        }
      }
    } catch {
      // Shelves directory might not exist
    }

    return chapters;
  }

  /**
   * Get context resolver instance
   */
  getContextResolver(): ContextResolver {
    return this.contextResolver;
  }

  /**
   * Check if manual context override is active
   */
  hasContextOverride(): boolean {
    return this.manualContext !== null;
  }

  /**
   * Get the current manual context override (if any)
   */
  getContextOverride(): RepositoryContext | null {
    return this.manualContext;
  }
}