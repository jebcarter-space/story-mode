import type { Library, LibrarySettings, Shelf, Book, Chapter, Content } from '../types';
import { createStorage, migrateLegacyData } from '../../lib/storage';
import type { StorageInterface } from '../../lib/storage/storage-interface';
import { createWorkbooks } from './workbooks.svelte';

export function createLibrary() {
  const storage: StorageInterface = createStorage('library');
  let library = $state<Library | null>(null);
  let isLoaded = $state(false);

  // Initialize library data
  async function initialize(): Promise<void> {
    try {
      let data = await storage.get<Library>('library');
      
      if (!data) {
        // Create default library structure
        data = createDefaultLibrary();
        await storage.set('library', data);
        
        // Migrate existing content if present
        await migrateExistingContent();
      }
      
      library = data;
      isLoaded = true;
    } catch (error) {
      console.error('Error initializing library:', error);
      // Create default library as fallback
      library = createDefaultLibrary();
      isLoaded = true;
    }
  }

  function createDefaultLibrary(): Library {
    const now = Date.now();
    const defaultShelf: Shelf = {
      id: 'default',
      name: 'Default',
      books: {},
      createdAt: now,
      updatedAt: now
    };

    return {
      shelves: {
        'default': defaultShelf
      },
      settings: {
        created: now,
        updated: now
      }
    };
  }

  async function migrateExistingContent(): Promise<void> {
    try {
      // Check for existing content in localStorage
      const existingContent = localStorage.getItem('content');
      if (existingContent && existingContent !== '{}') {
        const contentData: Content = JSON.parse(existingContent);
        
        if (Object.keys(contentData).length > 0) {
          // Create a default book with migrated content
          const now = Date.now();
          const defaultChapter: Chapter = {
            id: 'migrated-content',
            name: 'Migrated Story',
            content: contentData,
            createdAt: now,
            updatedAt: now
          };

          const defaultBook: Book = {
            id: 'migrated-book',
            name: 'Migrated Game',
            chapters: {
              'migrated-content': defaultChapter
            },
            lastAccessedChapter: 'migrated-content',
            createdAt: now,
            updatedAt: now
          };

          // Add to default shelf
          if (library?.shelves.default) {
            library.shelves.default.books['migrated-book'] = defaultBook;
            library.shelves.default.updatedAt = now;
            library.settings.lastAccessedShelf = 'default';
            library.settings.lastAccessedBook = 'migrated-book';
            library.settings.updated = now;
            
            await storage.set('library', library);
            console.log('Successfully migrated existing content to library system');
          }
        }
      }
    } catch (error) {
      console.error('Error migrating existing content:', error);
    }
  }

  async function createShelf(name: string, bannerImage?: string): Promise<string> {
    if (!library) await initialize();
    
    const now = Date.now();
    const id = generateId(name);
    const shelf: Shelf = {
      id,
      name,
      bannerImage,
      books: {},
      createdAt: now,
      updatedAt: now
    };

    if (library) {
      library.shelves[id] = shelf;
      library.settings.updated = now;
      await storage.set('library', JSON.parse(JSON.stringify(library)));
      
      // Auto-create a default workbook for this shelf
      const workbooks = createWorkbooks();
      workbooks.createDefaultWorkbook(id, name);
    }

    return id;
  }

  async function createBook(shelfId: string, name: string, coverImage?: string): Promise<string> {
    if (!library) await initialize();
    
    const now = Date.now();
    const id = generateId(name);
    const book: Book = {
      id,
      name,
      coverImage,
      chapters: {},
      createdAt: now,
      updatedAt: now
    };

    if (library && library.shelves[shelfId]) {
      library.shelves[shelfId].books[id] = book;
      library.shelves[shelfId].updatedAt = now;
      library.settings.updated = now;
      await storage.set('library', JSON.parse(JSON.stringify(library)));
    }

    return id;
  }

  async function createChapter(shelfId: string, bookId: string, name: string): Promise<string> {
    if (!library) await initialize();
    
    const now = Date.now();
    const id = generateId(name);
    const chapter: Chapter = {
      id,
      name,
      content: {},
      createdAt: now,
      updatedAt: now
    };

    if (library && library.shelves[shelfId]?.books[bookId]) {
      library.shelves[shelfId].books[bookId].chapters[id] = chapter;
      library.shelves[shelfId].books[bookId].updatedAt = now;
      library.shelves[shelfId].books[bookId].lastAccessedChapter = id;
      library.shelves[shelfId].updatedAt = now;
      library.settings.updated = now;
      await storage.set('library', JSON.parse(JSON.stringify(library)));
    }

    return id;
  }

  async function updateChapter(shelfId: string, bookId: string, chapterId: string, content: Content): Promise<void> {
    if (!library) await initialize();

    if (library && library.shelves[shelfId]?.books[bookId]?.chapters[chapterId]) {
      const now = Date.now();
      library.shelves[shelfId].books[bookId].chapters[chapterId].content = content;
      library.shelves[shelfId].books[bookId].chapters[chapterId].updatedAt = now;
      library.shelves[shelfId].books[bookId].updatedAt = now;
      library.shelves[shelfId].books[bookId].lastAccessedChapter = chapterId;
      library.shelves[shelfId].updatedAt = now;
      library.settings.lastAccessedShelf = shelfId;
      library.settings.lastAccessedBook = bookId;
      library.settings.updated = now;
      await storage.set('library', JSON.parse(JSON.stringify(library)));
    }
  }

  function generateId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) + '-' + Date.now().toString().slice(-6);
  }

  function getContinueBookPath(): string {
    if (!library || !isLoaded) return '/library';

    const { lastAccessedShelf, lastAccessedBook } = library.settings;
    if (lastAccessedShelf && lastAccessedBook && 
        library.shelves[lastAccessedShelf]?.books[lastAccessedBook]) {
      return `/library/${lastAccessedShelf}/${lastAccessedBook}`;
    }

    // Find most recently updated book
    let mostRecentBook: { shelf: string; book: string; updated: number } | null = null;
    
    Object.entries(library.shelves).forEach(([shelfId, shelf]) => {
      Object.entries(shelf.books).forEach(([bookId, book]) => {
        if (!mostRecentBook || book.updatedAt > mostRecentBook.updated) {
          mostRecentBook = { shelf: shelfId, book: bookId, updated: book.updatedAt };
        }
      });
    });

    if (mostRecentBook) {
      return `/library/${mostRecentBook.shelf}/${mostRecentBook.book}`;
    }

    return '/library';
  }

  // Initialize on creation
  initialize();

  return {
    get value() {
      return library;
    },
    get isLoaded() {
      return isLoaded;
    },
    initialize,
    createShelf,
    createBook,
    createChapter,
    updateChapter,
    getContinueBookPath,
  };
}