import * as vscode from 'vscode';
import { LibraryService } from '../services/library-service';

export async function handleCreateShelf(libraryService: LibraryService, explorer: any): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: 'Enter shelf name',
    placeHolder: 'e.g. Fantasy Adventures'
  });

  if (!name) return;

  const bannerImage = await vscode.window.showInputBox({
    prompt: 'Enter banner image URL (optional)',
    placeHolder: 'https://example.com/image.jpg'
  });

  try {
    await libraryService.createShelf(name, bannerImage || undefined);
    explorer.refresh();
    vscode.window.showInformationMessage(`Shelf "${name}" created successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create shelf: ${error}`);
  }
}

export async function handleEditShelf(libraryService: LibraryService, explorer: any, treeItem?: any): Promise<void> {
  let shelfId: string;
  let currentShelf: any;

  if (treeItem?.shelfId) {
    shelfId = treeItem.shelfId;
    currentShelf = await libraryService.getShelf(shelfId);
  } else {
    // Show shelf selector
    const shelves = await libraryService.getShelves();
    if (shelves.length === 0) {
      vscode.window.showInformationMessage('No shelves found. Create a shelf first.');
      return;
    }

    const selectedShelf = await vscode.window.showQuickPick(
      shelves.map(shelf => ({ label: shelf.name, description: shelf.id, shelf })),
      { placeHolder: 'Select shelf to edit' }
    );

    if (!selectedShelf) return;
    shelfId = selectedShelf.shelf.id;
    currentShelf = selectedShelf.shelf;
  }

  if (!currentShelf) {
    vscode.window.showErrorMessage('Shelf not found');
    return;
  }

  const name = await vscode.window.showInputBox({
    prompt: 'Enter new shelf name',
    value: currentShelf.name
  });

  if (name === undefined) return; // User cancelled

  const bannerImage = await vscode.window.showInputBox({
    prompt: 'Enter banner image URL (optional)',
    value: currentShelf.bannerImage || ''
  });

  try {
    await libraryService.updateShelf(shelfId, name || undefined, bannerImage || undefined);
    explorer.refresh();
    vscode.window.showInformationMessage(`Shelf "${name}" updated successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to update shelf: ${error}`);
  }
}

export async function handleDeleteShelf(libraryService: LibraryService, explorer: any, treeItem?: any): Promise<void> {
  let shelfId: string;
  let shelfName: string;

  if (treeItem?.shelfId) {
    shelfId = treeItem.shelfId;
    const shelf = await libraryService.getShelf(shelfId);
    shelfName = shelf?.name || 'Unknown';
  } else {
    // Show shelf selector
    const shelves = await libraryService.getShelves();
    if (shelves.length === 0) {
      vscode.window.showInformationMessage('No shelves found.');
      return;
    }

    const selectedShelf = await vscode.window.showQuickPick(
      shelves.map(shelf => ({ label: shelf.name, description: shelf.id, shelf })),
      { placeHolder: 'Select shelf to delete' }
    );

    if (!selectedShelf) return;
    shelfId = selectedShelf.shelf.id;
    shelfName = selectedShelf.shelf.name;
  }

  // Confirmation
  const books = await libraryService.getBooks(shelfId);
  const bookCount = books.length;
  const confirmMessage = bookCount > 0 
    ? `Are you sure you want to delete "${shelfName}" and its ${bookCount} book(s)? This action cannot be undone.`
    : `Are you sure you want to delete "${shelfName}"?`;

  const confirmation = await vscode.window.showWarningMessage(
    confirmMessage,
    { modal: true },
    'Delete'
  );

  if (confirmation !== 'Delete') return;

  try {
    await libraryService.deleteShelf(shelfId);
    explorer.refresh();
    vscode.window.showInformationMessage(`Shelf "${shelfName}" deleted successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete shelf: ${error}`);
  }
}

export async function handleCreateBook(libraryService: LibraryService, explorer: any, treeItem?: any): Promise<void> {
  let shelfId: string;

  if (treeItem?.shelfId && treeItem.contextValue === 'shelf') {
    shelfId = treeItem.shelfId;
  } else {
    // Show shelf selector
    const shelves = await libraryService.getShelves();
    if (shelves.length === 0) {
      vscode.window.showInformationMessage('No shelves found. Create a shelf first.');
      return;
    }

    const selectedShelf = await vscode.window.showQuickPick(
      shelves.map(shelf => ({ label: shelf.name, description: shelf.id, shelf })),
      { placeHolder: 'Select shelf for the new book' }
    );

    if (!selectedShelf) return;
    shelfId = selectedShelf.shelf.id;
  }

  const name = await vscode.window.showInputBox({
    prompt: 'Enter book name',
    placeHolder: 'e.g. The Dragon\'s Quest'
  });

  if (!name) return;

  const coverImage = await vscode.window.showInputBox({
    prompt: 'Enter cover image URL (optional)',
    placeHolder: 'https://example.com/cover.jpg'
  });

  try {
    await libraryService.createBook(shelfId, name, coverImage || undefined);
    explorer.refresh();
    vscode.window.showInformationMessage(`Book "${name}" created successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create book: ${error}`);
  }
}

export async function handleEditBook(libraryService: LibraryService, explorer: any, treeItem?: any): Promise<void> {
  let shelfId: string;
  let bookId: string;
  let currentBook: any;

  if (treeItem?.shelfId && treeItem?.bookId) {
    shelfId = treeItem.shelfId;
    bookId = treeItem.bookId;
    currentBook = await libraryService.getBook(shelfId, bookId);
  } else {
    // Show book selector
    const shelves = await libraryService.getShelves();
    const bookOptions: Array<{ label: string, description: string, book: any, shelfId: string }> = [];
    
    for (const shelf of shelves) {
      const books = await libraryService.getBooks(shelf.id);
      for (const book of books) {
        bookOptions.push({
          label: book.name,
          description: `${shelf.name} > ${book.name}`,
          book,
          shelfId: shelf.id
        });
      }
    }

    if (bookOptions.length === 0) {
      vscode.window.showInformationMessage('No books found. Create a book first.');
      return;
    }

    const selectedBook = await vscode.window.showQuickPick(bookOptions, {
      placeHolder: 'Select book to edit'
    });

    if (!selectedBook) return;
    shelfId = selectedBook.shelfId;
    bookId = selectedBook.book.id;
    currentBook = selectedBook.book;
  }

  if (!currentBook) {
    vscode.window.showErrorMessage('Book not found');
    return;
  }

  const name = await vscode.window.showInputBox({
    prompt: 'Enter new book name',
    value: currentBook.name
  });

  if (name === undefined) return; // User cancelled

  const coverImage = await vscode.window.showInputBox({
    prompt: 'Enter cover image URL (optional)',
    value: currentBook.coverImage || ''
  });

  try {
    await libraryService.updateBook(shelfId, bookId, name || undefined, coverImage || undefined);
    explorer.refresh();
    vscode.window.showInformationMessage(`Book "${name}" updated successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to update book: ${error}`);
  }
}

export async function handleDeleteBook(libraryService: LibraryService, explorer: any, treeItem?: any): Promise<void> {
  let shelfId: string;
  let bookId: string;
  let bookName: string;

  if (treeItem?.shelfId && treeItem?.bookId) {
    shelfId = treeItem.shelfId;
    bookId = treeItem.bookId;
    const book = await libraryService.getBook(shelfId, bookId);
    bookName = book?.name || 'Unknown';
  } else {
    // Show book selector
    const shelves = await libraryService.getShelves();
    const bookOptions: Array<{ label: string, description: string, book: any, shelfId: string }> = [];
    
    for (const shelf of shelves) {
      const books = await libraryService.getBooks(shelf.id);
      for (const book of books) {
        bookOptions.push({
          label: book.name,
          description: `${shelf.name} > ${book.name}`,
          book,
          shelfId: shelf.id
        });
      }
    }

    if (bookOptions.length === 0) {
      vscode.window.showInformationMessage('No books found.');
      return;
    }

    const selectedBook = await vscode.window.showQuickPick(bookOptions, {
      placeHolder: 'Select book to delete'
    });

    if (!selectedBook) return;
    shelfId = selectedBook.shelfId;
    bookId = selectedBook.book.id;
    bookName = selectedBook.book.name;
  }

  // Confirmation
  const chapters = await libraryService.getChapters(shelfId, bookId);
  const chapterCount = chapters.length;
  const confirmMessage = chapterCount > 0 
    ? `Are you sure you want to delete "${bookName}" and its ${chapterCount} chapter(s)? This action cannot be undone.`
    : `Are you sure you want to delete "${bookName}"?`;

  const confirmation = await vscode.window.showWarningMessage(
    confirmMessage,
    { modal: true },
    'Delete'
  );

  if (confirmation !== 'Delete') return;

  try {
    await libraryService.deleteBook(shelfId, bookId);
    explorer.refresh();
    vscode.window.showInformationMessage(`Book "${bookName}" deleted successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete book: ${error}`);
  }
}

export async function handleCreateChapter(libraryService: LibraryService, explorer: any, treeItem?: any): Promise<void> {
  let shelfId: string;
  let bookId: string;

  if (treeItem?.shelfId && treeItem?.bookId && treeItem.contextValue === 'book') {
    shelfId = treeItem.shelfId;
    bookId = treeItem.bookId;
  } else {
    // Show book selector
    const shelves = await libraryService.getShelves();
    const bookOptions: Array<{ label: string, description: string, book: any, shelfId: string }> = [];
    
    for (const shelf of shelves) {
      const books = await libraryService.getBooks(shelf.id);
      for (const book of books) {
        bookOptions.push({
          label: book.name,
          description: `${shelf.name} > ${book.name}`,
          book,
          shelfId: shelf.id
        });
      }
    }

    if (bookOptions.length === 0) {
      vscode.window.showInformationMessage('No books found. Create a book first.');
      return;
    }

    const selectedBook = await vscode.window.showQuickPick(bookOptions, {
      placeHolder: 'Select book for the new chapter'
    });

    if (!selectedBook) return;
    shelfId = selectedBook.shelfId;
    bookId = selectedBook.book.id;
  }

  const name = await vscode.window.showInputBox({
    prompt: 'Enter chapter name',
    placeHolder: 'e.g. Chapter 1: The Beginning'
  });

  if (!name) return;

  try {
    await libraryService.createChapter(shelfId, bookId, name);
    explorer.refresh();
    vscode.window.showInformationMessage(`Chapter "${name}" created successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create chapter: ${error}`);
  }
}

export async function handleEditChapter(libraryService: LibraryService, explorer: any, treeItem?: any): Promise<void> {
  let shelfId: string;
  let bookId: string;
  let chapterId: string;
  let currentChapter: any;

  if (treeItem?.shelfId && treeItem?.bookId && treeItem?.chapterId) {
    shelfId = treeItem.shelfId;
    bookId = treeItem.bookId;
    chapterId = treeItem.chapterId;
    currentChapter = await libraryService.getChapter(shelfId, bookId, chapterId);
  } else {
    // Show chapter selector
    const shelves = await libraryService.getShelves();
    const chapterOptions: Array<{ label: string, description: string, chapter: any, shelfId: string, bookId: string }> = [];
    
    for (const shelf of shelves) {
      const books = await libraryService.getBooks(shelf.id);
      for (const book of books) {
        const chapters = await libraryService.getChapters(shelf.id, book.id);
        for (const chapter of chapters) {
          chapterOptions.push({
            label: chapter.name,
            description: `${shelf.name} > ${book.name} > ${chapter.name}`,
            chapter,
            shelfId: shelf.id,
            bookId: book.id
          });
        }
      }
    }

    if (chapterOptions.length === 0) {
      vscode.window.showInformationMessage('No chapters found. Create a chapter first.');
      return;
    }

    const selectedChapter = await vscode.window.showQuickPick(chapterOptions, {
      placeHolder: 'Select chapter to edit'
    });

    if (!selectedChapter) return;
    shelfId = selectedChapter.shelfId;
    bookId = selectedChapter.bookId;
    chapterId = selectedChapter.chapter.id;
    currentChapter = selectedChapter.chapter;
  }

  if (!currentChapter) {
    vscode.window.showErrorMessage('Chapter not found');
    return;
  }

  const name = await vscode.window.showInputBox({
    prompt: 'Enter new chapter name',
    value: currentChapter.name
  });

  if (name === undefined) return; // User cancelled

  try {
    await libraryService.updateChapter(shelfId, bookId, chapterId, name || undefined);
    explorer.refresh();
    vscode.window.showInformationMessage(`Chapter "${name}" updated successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to update chapter: ${error}`);
  }
}

export async function handleDeleteChapter(libraryService: LibraryService, explorer: any, treeItem?: any): Promise<void> {
  let shelfId: string;
  let bookId: string;
  let chapterId: string;
  let chapterName: string;

  if (treeItem?.shelfId && treeItem?.bookId && treeItem?.chapterId) {
    shelfId = treeItem.shelfId;
    bookId = treeItem.bookId;
    chapterId = treeItem.chapterId;
    const chapter = await libraryService.getChapter(shelfId, bookId, chapterId);
    chapterName = chapter?.name || 'Unknown';
  } else {
    // Show chapter selector
    const shelves = await libraryService.getShelves();
    const chapterOptions: Array<{ label: string, description: string, chapter: any, shelfId: string, bookId: string }> = [];
    
    for (const shelf of shelves) {
      const books = await libraryService.getBooks(shelf.id);
      for (const book of books) {
        const chapters = await libraryService.getChapters(shelf.id, book.id);
        for (const chapter of chapters) {
          chapterOptions.push({
            label: chapter.name,
            description: `${shelf.name} > ${book.name} > ${chapter.name}`,
            chapter,
            shelfId: shelf.id,
            bookId: book.id
          });
        }
      }
    }

    if (chapterOptions.length === 0) {
      vscode.window.showInformationMessage('No chapters found.');
      return;
    }

    const selectedChapter = await vscode.window.showQuickPick(chapterOptions, {
      placeHolder: 'Select chapter to delete'
    });

    if (!selectedChapter) return;
    shelfId = selectedChapter.shelfId;
    bookId = selectedChapter.bookId;
    chapterId = selectedChapter.chapter.id;
    chapterName = selectedChapter.chapter.name;
  }

  // Confirmation
  const confirmation = await vscode.window.showWarningMessage(
    `Are you sure you want to delete "${chapterName}"? This action cannot be undone.`,
    { modal: true },
    'Delete'
  );

  if (confirmation !== 'Delete') return;

  try {
    await libraryService.deleteChapter(shelfId, bookId, chapterId);
    explorer.refresh();
    vscode.window.showInformationMessage(`Chapter "${chapterName}" deleted successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete chapter: ${error}`);
  }
}

export async function handleOpenChapter(libraryService: LibraryService, treeItem: any): Promise<void> {
  if (!treeItem?.shelfId || !treeItem?.bookId || !treeItem?.chapterId) {
    vscode.window.showErrorMessage('Invalid chapter selection');
    return;
  }

  try {
    await libraryService.openChapter(treeItem.shelfId, treeItem.bookId, treeItem.chapterId);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open chapter: ${error}`);
  }
}