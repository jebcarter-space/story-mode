import * as vscode from 'vscode';

export class FileWatcher {
  private watchers: vscode.FileSystemWatcher[] = [];
  private _onDidChangeFiles: vscode.EventEmitter<vscode.Uri[]> = new vscode.EventEmitter<vscode.Uri[]>();
  readonly onDidChangeFiles: vscode.Event<vscode.Uri[]> = this._onDidChangeFiles.event;

  constructor(private context: vscode.ExtensionContext) {}

  startWatching(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const storyModePattern = new vscode.RelativePattern(
      workspaceFolders[0], 
      '.story-mode/**/*'
    );

    // Watch for all changes in .story-mode folder
    const watcher = vscode.workspace.createFileSystemWatcher(
      storyModePattern,
      false, // don't ignore creates
      false, // don't ignore changes
      false  // don't ignore deletes
    );

    // Handle file changes
    watcher.onDidCreate((uri) => {
      this._onDidChangeFiles.fire([uri]);
    });

    watcher.onDidChange((uri) => {
      this._onDidChangeFiles.fire([uri]);
    });

    watcher.onDidDelete((uri) => {
      this._onDidChangeFiles.fire([uri]);
    });

    this.watchers.push(watcher);
    this.context.subscriptions.push(watcher);
  }

  dispose(): void {
    this.watchers.forEach(watcher => watcher.dispose());
    this.watchers = [];
  }

  isRepositoryFile(uri: vscode.Uri): boolean {
    return uri.fsPath.includes('.story-mode/repositories/') && 
           uri.fsPath.endsWith('.md');
  }

  isTemplateFile(uri: vscode.Uri): boolean {
    return uri.fsPath.includes('.story-mode/templates/') && 
           uri.fsPath.endsWith('.md');
  }

  isLLMProfileFile(uri: vscode.Uri): boolean {
    return uri.fsPath.includes('.story-mode/llm-profiles/') && 
           uri.fsPath.endsWith('.json');
  }

  isSparkTableFile(uri: vscode.Uri): boolean {
    return uri.fsPath.includes('.story-mode/spark-tables/') && 
           uri.fsPath.endsWith('.csv');
  }
}