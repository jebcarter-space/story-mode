import * as vscode from 'vscode';
import { RepositoryManager } from './repository-manager';
import type { RepositoryContext, RepositoryItem } from '../types';

export class ContextIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private repositoryManager: RepositoryManager;

  constructor(context: vscode.ExtensionContext, repositoryManager: RepositoryManager) {
    this.repositoryManager = repositoryManager;
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      100
    );
    this.statusBarItem.command = 'story-mode.openRepository';
    this.statusBarItem.tooltip = 'Story Mode Repository Status - Click to manage';
    
    context.subscriptions.push(this.statusBarItem);
    
    // Update when active editor changes
    vscode.window.onDidChangeActiveTextEditor(this.updateContext, this, context.subscriptions);
    
    // Update when text document changes
    vscode.workspace.onDidChangeTextDocument(this.updateContext, this, context.subscriptions);
    
    // Initial update
    this.updateContext();
  }

  private async updateContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
      this.statusBarItem.hide();
      return;
    }

    try {
      // Get repository context for current file
      const context = await this.repositoryManager.getContextForFile(editor.document.uri);
      
      // Get relevant items
      const textBeforeCursor = editor.document.getText(
        new vscode.Range(new vscode.Position(0, 0), editor.selection.active)
      );
      const relevantItems = await this.repositoryManager.getRelevantItems(textBeforeCursor, context);
      
      // Update status bar
      this.updateStatusBarText(context, relevantItems);
      this.statusBarItem.show();
      
    } catch (error) {
      console.warn('Failed to update context indicator:', error);
      this.statusBarItem.hide();
    }
  }

  private updateStatusBarText(context: RepositoryContext, items: RepositoryItem[]): void {
    const scopeInfo = this.getScopeInfo(context);
    const itemStats = this.getItemStats(items);
    
    let text = `Story Mode: ${scopeInfo}`;
    if (itemStats.length > 0) {
      text += ` | ${itemStats}`;
    }
    
    this.statusBarItem.text = text;
  }

  private getScopeInfo(context: RepositoryContext): string {
    if (context.chapterId) {
      return `📄 Chapter`;
    } else if (context.bookId) {
      return `📖 Book`;
    } else if (context.shelfId) {
      return `📚 Shelf`;
    } else {
      return `📋 Library`;
    }
  }

  private getItemStats(items: RepositoryItem[]): string {
    const stats: { [key: string]: number } = {};
    
    items.forEach(item => {
      stats[item.category] = (stats[item.category] || 0) + 1;
    });
    
    const parts: string[] = [];
    
    if (stats.Character) parts.push(`🎭 ${stats.Character}`);
    if (stats.Location) parts.push(`📍 ${stats.Location}`);
    if (stats.Object) parts.push(`🏺 ${stats.Object}`);
    if (stats.Situation) parts.push(`⚡ ${stats.Situation}`);
    
    return parts.join(', ');
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}