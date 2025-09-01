import * as vscode from 'vscode';

// Library types based on the main app's structure
export interface Library {
  shelves: Record<string, Shelf>;
  settings: LibrarySettings;
}

export interface LibrarySettings {
  lastAccessedShelf?: string;
  lastAccessedBook?: string;
  created: number;
  updated: number;
}

export interface Shelf {
  id: string;
  name: string;
  bannerImage?: string;
  books: Record<string, Book>;
  createdAt: number;
  updatedAt: number;
}

export interface Book {
  id: string;
  name: string;
  coverImage?: string;
  chapters: Record<string, Chapter>;
  lastAccessedChapter?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  id: string;
  name: string;
  content: Record<number, any>; // Content with timestamps
  createdAt: number;
  updatedAt: number;
}

export class LibraryService {
  private libraryData: Library | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  private async getLibraryPath(): Promise<vscode.Uri | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return null;
    
    return vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'library.json');
  }

  private async getShelvesPath(): Promise<vscode.Uri | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return null;
    
    return vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'shelves');
  }

  async initialize(): Promise<void> {
    const libraryPath = await this.getLibraryPath();
    if (!libraryPath) return;

    try {
      const data = await vscode.workspace.fs.readFile(libraryPath);
      const libraryJson = JSON.parse(Buffer.from(data).toString());
      this.libraryData = libraryJson;
    } catch (error) {
      // Create default library if none exists
      this.libraryData = this.createDefaultLibrary();
      await this.saveLibrary();
    }
  }

  private createDefaultLibrary(): Library {
    const now = Date.now();
    return {
      shelves: {},
      settings: {
        created: now,
        updated: now
      }
    };
  }

  private async saveLibrary(): Promise<void> {
    const libraryPath = await this.getLibraryPath();
    if (!libraryPath || !this.libraryData) return;

    const libraryJson = JSON.stringify(this.libraryData, null, 2);
    await vscode.workspace.fs.writeFile(libraryPath, Buffer.from(libraryJson));
  }

  private generateId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) + '-' + Date.now().toString().slice(-6);
  }

  // Shelf Management
  async createShelf(name: string, bannerImage?: string): Promise<string> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData) throw new Error('Failed to initialize library');

    const now = Date.now();
    const id = this.generateId(name);
    const shelf: Shelf = {
      id,
      name,
      bannerImage,
      books: {},
      createdAt: now,
      updatedAt: now
    };

    this.libraryData.shelves[id] = shelf;
    this.libraryData.settings.updated = now;

    // Create physical directory
    const shelvesPath = await this.getShelvesPath();
    if (shelvesPath) {
      const shelfPath = vscode.Uri.joinPath(shelvesPath, id);
      await vscode.workspace.fs.createDirectory(shelfPath);
      
      // Create shelf metadata file
      const metadataPath = vscode.Uri.joinPath(shelfPath, '.shelf.json');
      const metadata = {
        name,
        bannerImage,
        createdAt: now,
        updatedAt: now
      };
      await vscode.workspace.fs.writeFile(metadataPath, Buffer.from(JSON.stringify(metadata, null, 2)));
    }

    await this.saveLibrary();
    return id;
  }

  async updateShelf(shelfId: string, name?: string, bannerImage?: string): Promise<void> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]) {
      throw new Error('Shelf not found');
    }

    const now = Date.now();
    if (name) this.libraryData.shelves[shelfId].name = name;
    if (bannerImage !== undefined) this.libraryData.shelves[shelfId].bannerImage = bannerImage;
    this.libraryData.shelves[shelfId].updatedAt = now;
    this.libraryData.settings.updated = now;

    // Update physical metadata
    const shelvesPath = await this.getShelvesPath();
    if (shelvesPath) {
      const metadataPath = vscode.Uri.joinPath(shelvesPath, shelfId, '.shelf.json');
      const metadata = {
        name: this.libraryData.shelves[shelfId].name,
        bannerImage: this.libraryData.shelves[shelfId].bannerImage,
        createdAt: this.libraryData.shelves[shelfId].createdAt,
        updatedAt: now
      };
      await vscode.workspace.fs.writeFile(metadataPath, Buffer.from(JSON.stringify(metadata, null, 2)));
    }

    await this.saveLibrary();
  }

  async deleteShelf(shelfId: string): Promise<void> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]) {
      throw new Error('Shelf not found');
    }

    delete this.libraryData.shelves[shelfId];
    this.libraryData.settings.updated = Date.now();

    // Remove physical directory
    const shelvesPath = await this.getShelvesPath();
    if (shelvesPath) {
      const shelfPath = vscode.Uri.joinPath(shelvesPath, shelfId);
      try {
        await vscode.workspace.fs.delete(shelfPath, { recursive: true });
      } catch (error) {
        // Directory might not exist, ignore error
      }
    }

    await this.saveLibrary();
  }

  // Book Management
  async createBook(shelfId: string, name: string, coverImage?: string): Promise<string> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]) {
      throw new Error('Shelf not found');
    }

    const now = Date.now();
    const id = this.generateId(name);
    const book: Book = {
      id,
      name,
      coverImage,
      chapters: {},
      createdAt: now,
      updatedAt: now
    };

    this.libraryData.shelves[shelfId].books[id] = book;
    this.libraryData.shelves[shelfId].updatedAt = now;
    this.libraryData.settings.updated = now;

    // Create physical directory
    const shelvesPath = await this.getShelvesPath();
    if (shelvesPath) {
      const bookPath = vscode.Uri.joinPath(shelvesPath, shelfId, id);
      await vscode.workspace.fs.createDirectory(bookPath);
      
      // Create book metadata file
      const metadataPath = vscode.Uri.joinPath(bookPath, '.book.json');
      const metadata = {
        name,
        coverImage,
        createdAt: now,
        updatedAt: now
      };
      await vscode.workspace.fs.writeFile(metadataPath, Buffer.from(JSON.stringify(metadata, null, 2)));
    }

    await this.saveLibrary();
    return id;
  }

  async updateBook(shelfId: string, bookId: string, name?: string, coverImage?: string): Promise<void> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]?.books[bookId]) {
      throw new Error('Book not found');
    }

    const now = Date.now();
    if (name) this.libraryData.shelves[shelfId].books[bookId].name = name;
    if (coverImage !== undefined) this.libraryData.shelves[shelfId].books[bookId].coverImage = coverImage;
    this.libraryData.shelves[shelfId].books[bookId].updatedAt = now;
    this.libraryData.shelves[shelfId].updatedAt = now;
    this.libraryData.settings.updated = now;

    // Update physical metadata
    const shelvesPath = await this.getShelvesPath();
    if (shelvesPath) {
      const metadataPath = vscode.Uri.joinPath(shelvesPath, shelfId, bookId, '.book.json');
      const metadata = {
        name: this.libraryData.shelves[shelfId].books[bookId].name,
        coverImage: this.libraryData.shelves[shelfId].books[bookId].coverImage,
        createdAt: this.libraryData.shelves[shelfId].books[bookId].createdAt,
        updatedAt: now
      };
      await vscode.workspace.fs.writeFile(metadataPath, Buffer.from(JSON.stringify(metadata, null, 2)));
    }

    await this.saveLibrary();
  }

  async deleteBook(shelfId: string, bookId: string): Promise<void> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]?.books[bookId]) {
      throw new Error('Book not found');
    }

    delete this.libraryData.shelves[shelfId].books[bookId];
    this.libraryData.shelves[shelfId].updatedAt = Date.now();
    this.libraryData.settings.updated = Date.now();

    // Remove physical directory
    const shelvesPath = await this.getShelvesPath();
    if (shelvesPath) {
      const bookPath = vscode.Uri.joinPath(shelvesPath, shelfId, bookId);
      try {
        await vscode.workspace.fs.delete(bookPath, { recursive: true });
      } catch (error) {
        // Directory might not exist, ignore error
      }
    }

    await this.saveLibrary();
  }

  // Chapter Management
  async createChapter(shelfId: string, bookId: string, name: string): Promise<string> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]?.books[bookId]) {
      throw new Error('Book not found');
    }

    const now = Date.now();
    const id = this.generateId(name);
    const chapter: Chapter = {
      id,
      name,
      content: {},
      createdAt: now,
      updatedAt: now
    };

    this.libraryData.shelves[shelfId].books[bookId].chapters[id] = chapter;
    this.libraryData.shelves[shelfId].books[bookId].lastAccessedChapter = id;
    this.libraryData.shelves[shelfId].books[bookId].updatedAt = now;
    this.libraryData.shelves[shelfId].updatedAt = now;
    this.libraryData.settings.updated = now;

    // Create physical file
    const shelvesPath = await this.getShelvesPath();
    if (shelvesPath) {
      const chapterPath = vscode.Uri.joinPath(shelvesPath, shelfId, bookId, `${id}.md`);
      const chapterContent = `# ${name}\n\n*Created: ${new Date(now).toLocaleString()}*\n\nStart writing your chapter here...`;
      await vscode.workspace.fs.writeFile(chapterPath, Buffer.from(chapterContent));
    }

    await this.saveLibrary();
    return id;
  }

  async updateChapter(shelfId: string, bookId: string, chapterId: string, name?: string, content?: Record<number, any>): Promise<void> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]?.books[bookId]?.chapters[chapterId]) {
      throw new Error('Chapter not found');
    }

    const now = Date.now();
    if (name) this.libraryData.shelves[shelfId].books[bookId].chapters[chapterId].name = name;
    if (content) this.libraryData.shelves[shelfId].books[bookId].chapters[chapterId].content = content;
    this.libraryData.shelves[shelfId].books[bookId].chapters[chapterId].updatedAt = now;
    this.libraryData.shelves[shelfId].books[bookId].lastAccessedChapter = chapterId;
    this.libraryData.shelves[shelfId].books[bookId].updatedAt = now;
    this.libraryData.shelves[shelfId].updatedAt = now;
    this.libraryData.settings.updated = now;

    await this.saveLibrary();
  }

  async deleteChapter(shelfId: string, bookId: string, chapterId: string): Promise<void> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]?.books[bookId]?.chapters[chapterId]) {
      throw new Error('Chapter not found');
    }

    delete this.libraryData.shelves[shelfId].books[bookId].chapters[chapterId];
    this.libraryData.shelves[shelfId].books[bookId].updatedAt = Date.now();
    this.libraryData.shelves[shelfId].updatedAt = Date.now();
    this.libraryData.settings.updated = Date.now();

    // Remove physical file
    const shelvesPath = await this.getShelvesPath();
    if (shelvesPath) {
      const chapterPath = vscode.Uri.joinPath(shelvesPath, shelfId, bookId, `${chapterId}.md`);
      try {
        await vscode.workspace.fs.delete(chapterPath);
      } catch (error) {
        // File might not exist, ignore error
      }
    }

    await this.saveLibrary();
  }

  // Getters
  get library(): Library | null {
    return this.libraryData;
  }

  async getShelves(): Promise<Shelf[]> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData) return [];
    return Object.values(this.libraryData.shelves);
  }

  async getBooks(shelfId: string): Promise<Book[]> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]) return [];
    return Object.values(this.libraryData.shelves[shelfId].books);
  }

  async getChapters(shelfId: string, bookId: string): Promise<Chapter[]> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]?.books[bookId]) return [];
    return Object.values(this.libraryData.shelves[shelfId].books[bookId].chapters);
  }

  async getShelf(shelfId: string): Promise<Shelf | null> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData) return null;
    return this.libraryData.shelves[shelfId] || null;
  }

  async getBook(shelfId: string, bookId: string): Promise<Book | null> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]) return null;
    return this.libraryData.shelves[shelfId].books[bookId] || null;
  }

  async getChapter(shelfId: string, bookId: string, chapterId: string): Promise<Chapter | null> {
    if (!this.libraryData) await this.initialize();
    if (!this.libraryData || !this.libraryData.shelves[shelfId]?.books[bookId]) return null;
    return this.libraryData.shelves[shelfId].books[bookId].chapters[chapterId] || null;
  }

  async openChapter(shelfId: string, bookId: string, chapterId: string): Promise<void> {
    const shelvesPath = await this.getShelvesPath();
    if (!shelvesPath) return;

    const chapterPath = vscode.Uri.joinPath(shelvesPath, shelfId, bookId, `${chapterId}.md`);
    try {
      await vscode.commands.executeCommand('vscode.open', chapterPath);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open chapter: ${error}`);
    }
  }
}