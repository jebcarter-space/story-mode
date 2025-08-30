import type { Content, ContentData } from '../data/types';

export interface ExportOptions {
  includeTimestamps?: boolean;
  includeMetadata?: boolean;
  format?: 'json' | 'text' | 'markdown';
}

/**
 * Export complete conversation history including all message types
 */
export function exportHistory(content: Content, options: ExportOptions = {}): string {
  const { includeTimestamps = true, includeMetadata = true, format = 'json' } = options;

  if (format === 'json') {
    const exportData = {
      metadata: includeMetadata ? {
        exportedAt: new Date().toISOString(),
        totalEntries: Object.keys(content).length,
        version: '1.0.0'
      } : undefined,
      content: includeTimestamps ? content : Object.values(content)
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Text format
  const entries = Object.entries(content)
    .map(([timestamp, data]) => ({ timestamp: parseInt(timestamp), ...data }))
    .sort((a, b) => a.timestamp - b.timestamp);

  let output = '';
  
  if (includeMetadata) {
    output += `Story Mode Export\n`;
    output += `Exported: ${new Date().toISOString()}\n`;
    output += `Total Entries: ${entries.length}\n`;
    output += `\n${'='.repeat(50)}\n\n`;
  }

  entries.forEach((entry, index) => {
    if (includeTimestamps) {
      output += `[${new Date(entry.timestamp).toLocaleString()}] `;
    }
    output += `[${entry.type.toUpperCase()}]`;
    
    if (entry.input && entry.input.trim()) {
      output += ` Input: ${entry.input.trim()}`;
    }
    
    if (entry.output && entry.output.trim()) {
      output += `${entry.input ? ' | ' : ' '}Output: ${entry.output.trim()}`;
    }
    
    output += '\n';
    if (index < entries.length - 1) {
      output += '\n';
    }
  });

  return output;
}

/**
 * Export only user input and LLM prose output as clean story text
 */
export function exportStory(content: Content, options: ExportOptions = {}): string {
  const { format = 'text' } = options;

  // Filter to only include user inputs and LLM outputs
  const storyEntries = Object.entries(content)
    .map(([timestamp, data]) => ({ timestamp: parseInt(timestamp), ...data }))
    .filter(entry => 
      (entry.type === 'input' && entry.output?.trim()) ||
      (entry.type === 'llm' && entry.output?.trim())
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (format === 'json') {
    return JSON.stringify({
      metadata: {
        exportedAt: new Date().toISOString(),
        storyEntries: storyEntries.length,
        version: '1.0.0',
        type: 'story'
      },
      story: storyEntries
    }, null, 2);
  }

  // Text/Markdown format
  let output = '';
  
  storyEntries.forEach((entry, index) => {
    let text = '';
    
    if (entry.type === 'input' && entry.output?.trim()) {
      text = entry.output.trim();
    } else if (entry.type === 'llm' && entry.output?.trim()) {
      text = entry.output.trim();
    }
    
    if (text) {
      if (format === 'markdown') {
        // Add paragraph breaks in markdown
        output += text + '\n\n';
      } else {
        output += text;
        // Add line breaks between entries, but not after the last one
        if (index < storyEntries.length - 1) {
          output += '\n\n';
        }
      }
    }
  });

  return output.trim();
}

/**
 * Download content as a file
 */
export function downloadAsFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy content to clipboard
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Generate filename based on current date and content type
 */
export function generateFilename(type: 'history' | 'story', format: string): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  const extension = format === 'json' ? 'json' : 'txt';
  return `story-mode-${type}-${dateStr}-${timeStr}.${extension}`;
}