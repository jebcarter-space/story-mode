import * as vscode from 'vscode';
import { RepositoryManager } from './repository-manager';
import { ContextService } from './context-service';
import type { RepositoryContext, RepositoryItem, StreamingStatus } from '../types';

export class ContextIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private repositoryManager: RepositoryManager;
  private contextService: ContextService | null = null;
  private streamingStatus: StreamingStatus | null = null;
  private streamingUpdateInterval: NodeJS.Timeout | null = null;

  constructor(context: vscode.ExtensionContext, repositoryManager: RepositoryManager) {
    this.repositoryManager = repositoryManager;
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      100
    );
    this.statusBarItem.command = 'story-mode.setContext';
    this.statusBarItem.tooltip = 'Story Mode Context - Click to change';
    
    context.subscriptions.push(this.statusBarItem);
    
    // Update when active editor changes
    vscode.window.onDidChangeActiveTextEditor(this.updateContext, this, context.subscriptions);
    
    // Update when text document changes
    vscode.workspace.onDidChangeTextDocument(this.updateContext, this, context.subscriptions);
    
    // Initial update
    this.updateContext();
  }

  /**
   * Set the context service for enhanced context management
   */
  setContextService(contextService: ContextService): void {
    this.contextService = contextService;
    
    // Listen for context changes
    contextService.onDidChangeContext(() => {
      this.updateContext();
    });
  }

  private async updateContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
      this.statusBarItem.hide();
      return;
    }

    try {
      // Get repository context - use context service if available
      let context: RepositoryContext;
      if (this.contextService) {
        context = await this.contextService.getCurrentContext(editor.document.uri);
      } else {
        context = await this.repositoryManager.getContextForFile(editor.document.uri);
      }
      
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
    const overrideIndicator = this.contextService?.hasContextOverride() ? '🔒 ' : '';
    
    let text = `${overrideIndicator}Story Mode: ${scopeInfo}`;
    if (itemStats.length > 0) {
      text += ` | ${itemStats}`;
    }
    
    this.statusBarItem.text = text;
    
    // Update tooltip
    let tooltip = 'Story Mode Context';
    if (this.contextService?.hasContextOverride()) {
      tooltip += ' (Override Active)';
    }
    tooltip += ' - Click to change context';
    this.statusBarItem.tooltip = tooltip;
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

  /**
   * Start showing streaming status
   */
  public startStreamingStatus(): void {
    const config = vscode.workspace.getConfiguration('storyMode');
    if (!config.get('streamingShowStatus', true)) {
      return;
    }

    this.streamingStatus = {
      isActive: true,
      tokensReceived: 0,
      elapsedTime: 0,
      retryCount: 0
    };

    // Update streaming status every 100ms
    this.streamingUpdateInterval = setInterval(() => {
      if (this.streamingStatus) {
        this.streamingStatus.elapsedTime += 100;
        this.updateStreamingStatusBar();
      }
    }, 100);

    this.updateStreamingStatusBar();
  }

  /**
   * Update streaming status with new token
   */
  public updateStreamingToken(): void {
    if (this.streamingStatus) {
      this.streamingStatus.tokensReceived++;
      
      // Calculate tokens per second
      if (this.streamingStatus.elapsedTime > 0) {
        this.streamingStatus.tokensPerSecond = (this.streamingStatus.tokensReceived * 1000) / this.streamingStatus.elapsedTime;
      }
    }
  }

  /**
   * Update streaming status with retry
   */
  public updateStreamingRetry(retryCount: number): void {
    if (this.streamingStatus) {
      this.streamingStatus.retryCount = retryCount;
      this.updateStreamingStatusBar();
    }
  }

  /**
   * Update streaming status with error
   */
  public updateStreamingError(error: string): void {
    if (this.streamingStatus) {
      this.streamingStatus.lastError = error;
      this.updateStreamingStatusBar();
    }
  }

  /**
   * Stop streaming status and restore normal status
   */
  public stopStreamingStatus(): void {
    if (this.streamingUpdateInterval) {
      clearInterval(this.streamingUpdateInterval);
      this.streamingUpdateInterval = null;
    }
    
    this.streamingStatus = null;
    
    // Restore normal status
    this.updateContext();
  }

  /**
   * Update status bar with streaming information
   */
  private updateStreamingStatusBar(): void {
    if (!this.streamingStatus) return;

    const status = this.streamingStatus;
    const elapsed = Math.round(status.elapsedTime / 1000);
    const tokensPerSec = status.tokensPerSecond ? Math.round(status.tokensPerSecond) : 0;
    
    let text = `🔄 Streaming`;
    let tooltip = `Story Mode: Generating streaming response`;

    if (status.tokensReceived > 0) {
      text += ` (${status.tokensReceived} tokens`;
      if (tokensPerSec > 0) {
        text += `, ${tokensPerSec}/s`;
      }
      text += ')';
    }

    if (status.retryCount && status.retryCount > 0) {
      text += ` [Retry ${status.retryCount}]`;
      tooltip += ` - Retry ${status.retryCount}`;
    }

    if (status.lastError) {
      text += ' ⚠️';
      tooltip += ` - ${status.lastError}`;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
    this.statusBarItem.show();
  }

  public dispose(): void {
    if (this.streamingUpdateInterval) {
      clearInterval(this.streamingUpdateInterval);
    }
    this.statusBarItem.dispose();
  }
}