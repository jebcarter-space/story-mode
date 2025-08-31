import * as vscode from 'vscode';
import { RepositoryManager } from '../services/repository-manager';
import { TemplateManager } from '../services/template-manager';
import type { RepositoryItem, Template } from '../types';

export class SmartSuggestionsService {
  constructor(
    private repositoryManager: RepositoryManager,
    private templateManager: TemplateManager
  ) {}

  /**
   * Provide contextual suggestions based on current text
   */
  async getContextualSuggestions(text: string, cursorPosition: number): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];
    const textBeforeCursor = text.substring(0, cursorPosition);
    const currentLine = textBeforeCursor.split('\n').pop() || '';

    // Analyze text for different suggestion types
    const keywords = this.extractKeywords(textBeforeCursor);
    const repositoryItems = await this.repositoryManager.getRelevantItems(
      textBeforeCursor,
      await this.repositoryManager.getContextForFile(vscode.window.activeTextEditor?.document.uri!)
    );

    // Repository item suggestions
    if (repositoryItems.length > 0) {
      suggestions.push(...this.createRepositoryItemSuggestions(repositoryItems, keywords));
    }

    // Template suggestions based on context
    const templates = await this.templateManager.getTemplates();
    suggestions.push(...this.createTemplateSuggestions(templates, textBeforeCursor, currentLine));

    // Workflow suggestions
    suggestions.push(...this.createWorkflowSuggestions(textBeforeCursor, currentLine));

    return suggestions.slice(0, 10); // Limit to top 10 suggestions
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Count word frequency
    const wordCounts: { [word: string]: number } = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Return most frequent words
    return Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private createRepositoryItemSuggestions(
    items: RepositoryItem[], 
    keywords: string[]
  ): SuggestionItem[] {
    return items
      .filter(item => 
        // Only suggest items not recently mentioned
        !keywords.some(keyword => 
          item.name.toLowerCase().includes(keyword) ||
          keyword.includes(item.name.toLowerCase())
        )
      )
      .slice(0, 3)
      .map(item => ({
        label: `📝 Add ${item.category}: ${item.name}`,
        detail: item.description || '',
        kind: SuggestionKind.RepositoryItem,
        action: () => this.insertRepositoryItem(item),
        priority: 1
      }));
  }

  private createTemplateSuggestions(
    templates: { [key: string]: Template },
    textBeforeCursor: string,
    currentLine: string
  ): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];
    
    // Suggest templates based on context
    for (const [key, template] of Object.entries(templates)) {
      let priority = 0;
      let reason = '';

      // Check if current context matches template content or description
      const textLower = textBeforeCursor.toLowerCase();
      
      // Simple matching based on template description
      if (template.description && textLower.includes(template.description.toLowerCase().substring(0, 10))) {
        priority += 1;
        reason = 'Context match';
      }

      // Check for dialogue context
      if (currentLine.includes('"') && template.category === 'dialogue') {
        priority += 3;
        reason = 'Dialogue detected';
      }

      // Check for action context
      if (currentLine.match(/\b(attacks?|moves?|runs?|walks?)\b/i) && template.category === 'action') {
        priority += 3;
        reason = 'Action detected';
      }

      if (priority > 0) {
        suggestions.push({
          label: `🎭 Apply Template: ${template.name}`,
          detail: `${template.description} (${reason})`,
          kind: SuggestionKind.Template,
          action: () => this.applyTemplate(key),
          priority
        });
      }
    }

    return suggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }

  private createWorkflowSuggestions(textBeforeCursor: string, currentLine: string): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];
    
    // Suggest oracle consultation for questions
    if (currentLine.includes('?') || textBeforeCursor.match(/\b(will|can|should|would)\b/i)) {
      suggestions.push({
        label: '🔮 Consult Oracle',
        detail: 'Ask the oracle for guidance on this situation',
        kind: SuggestionKind.Workflow,
        action: async () => await vscode.commands.executeCommand('story-mode.continueWithOracle'),
        priority: 2
      });
    }

    // Suggest dice roll for uncertainty
    if (textBeforeCursor.match(/\b(attempts?|tries|rolls?|chance)\b/i)) {
      suggestions.push({
        label: '🎲 Roll Dice',
        detail: 'Roll dice to determine the outcome',
        kind: SuggestionKind.Workflow,
        action: async () => await vscode.commands.executeCommand('story-mode.rollDice'),
        priority: 1
      });
    }

    // Suggest continuing with AI for unfinished thoughts
    if (textBeforeCursor.endsWith('...') || currentLine.trim() === '') {
      suggestions.push({
        label: '🤖 Continue with AI',
        detail: 'Let AI continue the story from here',
        kind: SuggestionKind.Workflow,
        action: async () => await vscode.commands.executeCommand('story-mode.continueText'),
        priority: 1
      });
    }

    return suggestions;
  }

  private async insertRepositoryItem(item: RepositoryItem): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const insertText = `${item.name}`;
    const position = editor.selection.active;
    
    await editor.edit(editBuilder => {
      editBuilder.insert(position, insertText);
    });
  }

  private async applyTemplate(templateKey: string): Promise<void> {
    // This would trigger the template picker with pre-selected template
    await vscode.commands.executeCommand('story-mode.continueWithTemplate');
  }

  /**
   * Show suggestions in a quick pick interface
   */
  async showSuggestions(text: string, cursorPosition: number): Promise<void> {
    const suggestions = await this.getContextualSuggestions(text, cursorPosition);
    
    if (suggestions.length === 0) {
      vscode.window.showInformationMessage('No contextual suggestions available');
      return;
    }

    const quickPickItems = suggestions.map(suggestion => ({
      label: suggestion.label,
      detail: suggestion.detail,
      action: suggestion.action
    }));

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select a suggestion',
      matchOnDetail: true
    });

    if (selected && selected.action) {
      await selected.action();
    }
  }
}

export interface SuggestionItem {
  label: string;
  detail: string;
  kind: SuggestionKind;
  action: () => Promise<void> | void;
  priority: number;
}

export enum SuggestionKind {
  RepositoryItem = 'repository',
  Template = 'template',
  Workflow = 'workflow'
}