import * as vscode from 'vscode';
import type { Template, TemplateList } from '../types';

interface TemplateQuickPickItem extends vscode.QuickPickItem {
  template: Template;
  key: string;
}

export class TemplatePicker {
  constructor(private context: vscode.ExtensionContext) {}

  async showTemplateSelector(templates: TemplateList): Promise<{ template: Template; key: string } | undefined> {
    if (Object.keys(templates).length === 0) {
      vscode.window.showErrorMessage('No templates found. Create templates in .story-mode/templates/');
      return undefined;
    }

    // Group templates by category
    const categories: { [category: string]: TemplateQuickPickItem[] } = {};
    
    for (const [key, template] of Object.entries(templates)) {
      const category = template.category || 'General';
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push({
        label: template.name,
        description: template.description,
        detail: this.getTemplateDetailString(template),
        template,
        key
      });
    }

    // Create quick pick items with category separators
    const quickPickItems: (TemplateQuickPickItem | vscode.QuickPickItem)[] = [];
    const sortedCategories = Object.keys(categories).sort();
    
    for (let i = 0; i < sortedCategories.length; i++) {
      const category = sortedCategories[i];
      
      // Add category separator (except for the first one)
      if (i > 0) {
        quickPickItems.push({
          label: '',
          kind: vscode.QuickPickItemKind.Separator
        });
      }
      
      // Add category header
      quickPickItems.push({
        label: `$(folder) ${category}`,
        kind: vscode.QuickPickItemKind.Separator
      });
      
      // Add templates in this category
      const sortedTemplates = categories[category].sort((a, b) => a.label.localeCompare(b.label));
      quickPickItems.push(...sortedTemplates);
    }

    const selection = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select a template to insert',
      matchOnDescription: true,
      matchOnDetail: true,
      ignoreFocusOut: false
    });

    if (selection && 'template' in selection) {
      return {
        template: selection.template,
        key: selection.key
      };
    }

    return undefined;
  }

  private getTemplateDetailString(template: Template): string {
    const details: string[] = [];
    
    if (template.llmEnabled) {
      const profileText = template.llmProfile ? `Profile: ${template.llmProfile}` : 'LLM: Default profile';
      details.push(`🤖 ${profileText}`);
    }
    
    if (template.repositoryTarget && template.repositoryTarget !== 'None') {
      details.push(`📝 Saves to: ${template.repositoryTarget}`);
    }
    
    // Show first 50 chars of content as preview
    const contentPreview = template.content.length > 50 
      ? template.content.substring(0, 50) + '...' 
      : template.content;
    details.push(`Content: ${contentPreview}`);
    
    return details.join(' • ');
  }

  async showTemplatePreview(template: Template): Promise<boolean> {
    const previewContent = this.buildPreviewContent(template);
    
    const action = await vscode.window.showInformationMessage(
      'Template Preview',
      {
        modal: true,
        detail: previewContent
      },
      'Insert Template',
      'Cancel'
    );
    
    return action === 'Insert Template';
  }

  private buildPreviewContent(template: Template): string {
    let preview = `Name: ${template.name}\n`;
    preview += `Category: ${template.category}\n`;
    preview += `Description: ${template.description}\n\n`;
    
    if (template.llmEnabled) {
      preview += `🤖 LLM Expansion: Enabled\n`;
      if (template.llmProfile) {
        preview += `   Profile: ${template.llmProfile}\n`;
      }
      if (template.llmInstructions) {
        preview += `   Instructions: ${template.llmInstructions}\n`;
      }
      if (template.appendMode) {
        preview += `   Mode: Append to template\n`;
      } else {
        preview += `   Mode: Replace template\n`;
      }
      preview += '\n';
    }
    
    preview += `Content:\n${template.content}`;
    
    return preview;
  }
}