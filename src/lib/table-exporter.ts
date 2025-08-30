import type { RandomTable, CustomTableList } from "../data/types";

export interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'txt';
  filename?: string;
  pretty?: boolean;
}

export class TableExporter {
  /**
   * Export a single table in specified format
   */
  static exportTable(table: RandomTable, options: ExportOptions): ExportResult {
    try {
      const { format, filename, pretty = true } = options;
      
      switch (format) {
        case 'json':
          return this.exportAsJSON(table, filename, pretty);
        case 'csv':
          return this.exportAsCSV(table, filename);
        case 'txt':
          return this.exportAsTextList(table, filename);
        default:
          return { success: false, error: `Unsupported format: ${format}` };
      }
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Export multiple tables in specified format
   */
  static exportMultipleTables(tables: RandomTable[], options: ExportOptions): ExportResult {
    try {
      const { format, filename, pretty = true } = options;
      
      if (tables.length === 0) {
        return { success: false, error: 'No tables to export' };
      }

      switch (format) {
        case 'json':
          return this.exportMultipleAsJSON(tables, filename, pretty);
        case 'csv':
          return this.exportMultipleAsCSV(tables, filename);
        case 'txt':
          return this.exportMultipleAsTextList(tables, filename);
        default:
          return { success: false, error: `Unsupported format: ${format}` };
      }
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Export all tables from CustomTableList
   */
  static exportAllTables(tableList: CustomTableList, options: ExportOptions): ExportResult {
    const tables = Object.values(tableList);
    return this.exportMultipleTables(tables, options);
  }

  /**
   * Export single table as JSON
   */
  static exportAsJSON(table: RandomTable, filename?: string, pretty: boolean = true): ExportResult {
    try {
      const data = pretty ? JSON.stringify(table, null, 2) : JSON.stringify(table);
      const exportFilename = filename || `${this.sanitizeFilename(table.name)}.json`;
      
      return {
        success: true,
        data,
        filename: exportFilename
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Export multiple tables as JSON array
   */
  static exportMultipleAsJSON(tables: RandomTable[], filename?: string, pretty: boolean = true): ExportResult {
    try {
      const data = pretty ? JSON.stringify(tables, null, 2) : JSON.stringify(tables);
      const exportFilename = filename || `tables_export_${this.getTimestamp()}.json`;
      
      return {
        success: true,
        data,
        filename: exportFilename
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Export single table as CSV
   */
  static exportAsCSV(table: RandomTable, filename?: string): ExportResult {
    try {
      let csv = 'min,max,description\n';
      
      for (const row of table.table) {
        const min = row.min ?? '';
        const max = row.max ?? '';
        const description = this.escapeCSVValue(row.description.toString());
        csv += `${min},${max},${description}\n`;
      }
      
      const exportFilename = filename || `${this.sanitizeFilename(table.name)}.csv`;
      
      return {
        success: true,
        data: csv,
        filename: exportFilename
      };
    } catch (error) {
      return {
        success: false,
        error: `CSV export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Export multiple tables as CSV (each table in separate section)
   */
  static exportMultipleAsCSV(tables: RandomTable[], filename?: string): ExportResult {
    try {
      let csv = '';
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        
        if (i > 0) csv += '\n';
        
        // Add table header
        csv += `# ${table.name}\n`;
        csv += `# ${table.description}\n`;
        csv += `# Dice: ${table.diceFormula}\n`;
        csv += 'min,max,description\n';
        
        // Add table rows
        for (const row of table.table) {
          const min = row.min ?? '';
          const max = row.max ?? '';
          const description = this.escapeCSVValue(row.description.toString());
          csv += `${min},${max},${description}\n`;
        }
      }
      
      const exportFilename = filename || `tables_export_${this.getTimestamp()}.csv`;
      
      return {
        success: true,
        data: csv,
        filename: exportFilename
      };
    } catch (error) {
      return {
        success: false,
        error: `CSV export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Export single table as text list (descriptions only)
   */
  static exportAsTextList(table: RandomTable, filename?: string): ExportResult {
    try {
      const lines = table.table.map(row => row.description.toString());
      const data = lines.join('\n') + '\n';
      const exportFilename = filename || `${this.sanitizeFilename(table.name)}.txt`;
      
      return {
        success: true,
        data,
        filename: exportFilename
      };
    } catch (error) {
      return {
        success: false,
        error: `Text export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Export multiple tables as text list (each table in separate section)
   */
  static exportMultipleAsTextList(tables: RandomTable[], filename?: string): ExportResult {
    try {
      let text = '';
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        
        if (i > 0) text += '\n\n';
        
        // Add table header
        text += `=== ${table.name} ===\n`;
        text += `${table.description}\n`;
        text += `Dice: ${table.diceFormula}\n\n`;
        
        // Add table entries
        for (const row of table.table) {
          text += `${row.description}\n`;
        }
      }
      
      const exportFilename = filename || `tables_export_${this.getTimestamp()}.txt`;
      
      return {
        success: true,
        data: text,
        filename: exportFilename
      };
    } catch (error) {
      return {
        success: false,
        error: `Text export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Download exported data as file
   */
  static downloadFile(data: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Copy data to clipboard
   */
  static async copyToClipboard(data: string): Promise<boolean> {
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(data);
        return true;
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = data;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Generate backup of all tables with metadata
   */
  static generateBackup(tableList: CustomTableList): ExportResult {
    try {
      const backup = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        tableCount: Object.keys(tableList).length,
        tables: tableList
      };
      
      const data = JSON.stringify(backup, null, 2);
      const filename = `story-mode-tables-backup-${this.getTimestamp()}.json`;
      
      return {
        success: true,
        data,
        filename
      };
    } catch (error) {
      return {
        success: false,
        error: `Backup generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get MIME type for format
   */
  static getMimeType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'txt':
        return 'text/plain';
      default:
        return 'text/plain';
    }
  }

  /**
   * Sanitize filename for safe file system usage
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid characters
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .replace(/_+/g, '_')            // Replace multiple underscores with single
      .replace(/^_|_$/g, '')          // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Escape CSV value (handle quotes and commas)
   */
  static escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Get timestamp string for filenames
   */
  static getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }
}