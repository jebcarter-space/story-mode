import * as vscode from 'vscode';
import * as yaml from 'yaml';
import type { RepositoryContext, StoryFileMetadata } from '../types';

export class ContextResolver {
  constructor() {}

  /**
   * Extract context from file path and frontmatter
   */
  async resolveContext(fileUri: vscode.Uri): Promise<RepositoryContext> {
    const context: RepositoryContext = {
      filePath: fileUri.fsPath
    };

    try {
      // Extract context from file path
      this.extractPathContext(fileUri, context);

      // Extract context from frontmatter if it's a markdown file
      if (fileUri.fsPath.endsWith('.md')) {
        await this.extractFrontmatterContext(fileUri, context);
      }
    } catch (error) {
      console.warn('Could not resolve context for file:', fileUri.fsPath, error);
    }

    return context;
  }

  /**
   * Extract context from file path patterns
   */
  private extractPathContext(fileUri: vscode.Uri, context: RepositoryContext): void {
    const pathParts = fileUri.fsPath.split(/[/\\]/);
    
    // Look for .story-mode structure
    const storyModeIndex = pathParts.findIndex(part => part === '.story-mode');
    
    if (storyModeIndex >= 0) {
      // Look for shelves/shelf-name/books/book-name/chapters/chapter-name pattern
      const shelvesIndex = pathParts.indexOf('shelves', storyModeIndex);
      if (shelvesIndex >= 0 && pathParts.length > shelvesIndex + 1) {
        context.shelfId = pathParts[shelvesIndex + 1];
        
        const booksIndex = pathParts.indexOf('books', shelvesIndex);
        if (booksIndex >= 0 && pathParts.length > booksIndex + 1) {
          context.bookId = pathParts[booksIndex + 1];
          
          const chaptersIndex = pathParts.indexOf('chapters', booksIndex);
          if (chaptersIndex >= 0 && pathParts.length > chaptersIndex + 1) {
            // Remove file extension for chapter ID
            const chapterFile = pathParts[chaptersIndex + 1];
            context.chapterId = chapterFile.replace(/\.[^/.]+$/, '');
          }
        }
      }
    } else {
      // For files outside .story-mode, try to infer from path structure
      // Look for common patterns like genre/story-name or author/story-name
      const fileName = pathParts[pathParts.length - 1];
      if (fileName && fileName.includes('-')) {
        // Could be a story file, use filename as potential book context
        context.bookId = fileName.replace(/\.[^/.]+$/, '').replace(/-/g, ' ');
      }
    }
  }

  /**
   * Extract context from YAML frontmatter
   */
  private async extractFrontmatterContext(fileUri: vscode.Uri, context: RepositoryContext): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(fileUri);
      const text = Buffer.from(content).toString('utf8');
      
      // Look for YAML frontmatter
      const frontmatterMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) return;

      const frontmatter = yaml.parse(frontmatterMatch[1]) as StoryFileMetadata;
      
      // Override path-based context with explicit frontmatter
      if (frontmatter.shelf) context.shelfId = frontmatter.shelf;
      if (frontmatter.book) context.bookId = frontmatter.book;
      if (frontmatter.chapter) context.chapterId = frontmatter.chapter;
      
      // Repository-specific context
      if (frontmatter.repositoryScope) {
        Object.assign(context, frontmatter.repositoryScope);
      }
    } catch (error) {
      // Frontmatter parsing failed, continue with path-based context
      console.warn('Failed to parse frontmatter for context:', error);
    }
  }

  /**
   * Determine scope level for current context
   */
  getScopeLevel(context: RepositoryContext): 'library' | 'shelf' | 'book' | 'chapter' {
    if (context.chapterId) return 'chapter';
    if (context.bookId) return 'book';
    if (context.shelfId) return 'shelf';
    return 'library';
  }

  /**
   * Check if two contexts are compatible (one is subset of the other)
   */
  isContextCompatible(itemContext: RepositoryContext, currentContext: RepositoryContext): boolean {
    // Library level items are always compatible
    if (!itemContext.shelfId) return true;
    
    // Check shelf compatibility
    if (itemContext.shelfId && itemContext.shelfId !== currentContext.shelfId) {
      return false;
    }
    
    // Check book compatibility  
    if (itemContext.bookId && itemContext.bookId !== currentContext.bookId) {
      return false;
    }
    
    // Check chapter compatibility
    if (itemContext.chapterId && itemContext.chapterId !== currentContext.chapterId) {
      return false;
    }
    
    return true;
  }

  /**
   * Create a readable context description
   */
  getContextDescription(context: RepositoryContext): string {
    const parts: string[] = [];
    
    if (context.shelfId) parts.push(`Shelf: ${context.shelfId}`);
    if (context.bookId) parts.push(`Book: ${context.bookId}`);
    if (context.chapterId) parts.push(`Chapter: ${context.chapterId}`);
    
    return parts.length > 0 ? parts.join(' → ') : 'Library (Global)';
  }
}