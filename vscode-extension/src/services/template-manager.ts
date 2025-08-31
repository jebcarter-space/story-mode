import * as vscode from 'vscode';
import type { Template, TemplateList } from '../types';

export class TemplateManager {
  constructor(private context: vscode.ExtensionContext) {}

  async getTemplates(): Promise<TemplateList> {
    const templates: TemplateList = {};
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return templates;

    const templatesPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.story-mode', 'templates');
    
    try {
      const files = await vscode.workspace.fs.readDirectory(templatesPath);
      
      for (const [fileName, fileType] of files) {
        if (fileType === vscode.FileType.File && fileName.endsWith('.md')) {
          const template = await this.loadTemplate(vscode.Uri.joinPath(templatesPath, fileName));
          if (template) {
            const key = fileName.replace('.md', '');
            templates[key] = template;
          }
        }
      }
    } catch (error) {
      // Templates folder doesn't exist
    }

    return templates;
  }

  private async loadTemplate(fileUri: vscode.Uri): Promise<Template | null> {
    try {
      const content = await vscode.workspace.fs.readFile(fileUri);
      const text = content.toString();
      
      // Parse frontmatter if present
      let metadata: any = {};
      let templateContent = text;
      
      if (text.startsWith('---')) {
        const endOfFrontmatter = text.indexOf('---', 3);
        if (endOfFrontmatter > 0) {
          const frontmatter = text.slice(3, endOfFrontmatter);
          templateContent = text.slice(endOfFrontmatter + 3).trim();
          
          // Simple YAML parsing for templates
          for (const line of frontmatter.split('\n')) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              metadata[key.trim()] = valueParts.join(':').trim();
            }
          }
        }
      }

      const template: Template = {
        name: metadata.name || this.extractNameFromPath(fileUri.fsPath),
        description: metadata.description || '',
        content: templateContent,
        category: metadata.category || 'General',
        created: metadata.created || Date.now(),
        updated: metadata.updated || Date.now(),
        llmInstructions: metadata.llmInstructions || '',
        llmEnabled: metadata.llmEnabled === 'true' || false,
        appendMode: metadata.appendMode === 'true' || false,
        repositoryTarget: metadata.repositoryTarget || '',
        llmProfile: metadata.llmProfile || ''
      };

      return template;
    } catch (error) {
      console.warn(`Failed to load template ${fileUri.fsPath}:`, error);
      return null;
    }
  }

  private extractNameFromPath(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
