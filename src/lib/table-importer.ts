import type { RandomTable, MinMaxRow } from "../data/types";

export interface ImportResult {
  success: boolean;
  table?: RandomTable;
  error?: string;
  warnings?: string[];
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class TableImporter {
  /**
   * Import a table from various file formats
   */
  static async importFromFile(file: File): Promise<ImportResult> {
    try {
      const content = await this.readFileContent(file);
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.json')) {
        return this.importFromJSON(content, fileName);
      } else if (fileName.endsWith('.csv')) {
        return this.importFromCSV(content, fileName);
      } else if (fileName.endsWith('.txt')) {
        return this.importFromTextList(content, fileName);
      } else {
        // Try to guess format based on content
        return this.importFromUnknownFormat(content, fileName);
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Import from JSON format
   */
  static importFromJSON(content: string, fileName?: string): ImportResult {
    try {
      const data = JSON.parse(content);
      
      // Handle array of tables
      if (Array.isArray(data)) {
        if (data.length === 0) {
          return { success: false, error: 'JSON array is empty' };
        }
        
        // For now, just take the first table
        const validation = this.validateTableData(data[0]);
        if (!validation.isValid) {
          return { success: false, error: validation.errors.join(', '), warnings: validation.warnings };
        }
        
        return { success: true, table: this.normalizeTable(data[0], fileName), warnings: validation.warnings };
      }
      
      // Handle single table
      const validation = this.validateTableData(data);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', '), warnings: validation.warnings };
      }
      
      return { success: true, table: this.normalizeTable(data, fileName), warnings: validation.warnings };
    } catch (error) {
      return {
        success: false,
        error: `Invalid JSON format: ${error instanceof Error ? error.message : 'Parse error'}`
      };
    }
  }

  /**
   * Import from CSV format
   */
  static importFromCSV(content: string, fileName?: string): ImportResult {
    try {
      const lines = content.trim().split('\n');
      if (lines.length < 2) {
        return { success: false, error: 'CSV must have at least a header and one data row' };
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['min', 'max', 'description'];
      
      // Check if required headers are present
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        return { success: false, error: `Missing required CSV headers: ${missingHeaders.join(', ')}` };
      }

      const minIndex = headers.indexOf('min');
      const maxIndex = headers.indexOf('max');
      const descIndex = headers.indexOf('description');

      const tableRows: MinMaxRow[] = [];
      const warnings: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        
        if (values.length < headers.length) {
          warnings.push(`Row ${i + 1}: Incomplete data, skipping`);
          continue;
        }

        const min = this.parseNumber(values[minIndex]);
        const max = this.parseNumber(values[maxIndex]);
        const description = values[descIndex]?.trim() || '';

        if (description === '') {
          warnings.push(`Row ${i + 1}: Empty description`);
        }

        tableRows.push({ min, max, description });
      }

      if (tableRows.length === 0) {
        return { success: false, error: 'No valid table rows found in CSV' };
      }

      const tableName = fileName ? fileName.replace(/\.(csv|txt)$/i, '') : 'Imported Table';
      const table: RandomTable = {
        name: tableName,
        description: `Imported from ${fileName || 'CSV file'}`,
        diceFormula: this.generateDiceFormula(tableRows),
        table: tableRows
      };

      return { success: true, table, warnings };
    } catch (error) {
      return {
        success: false,
        error: `CSV parsing error: ${error instanceof Error ? error.message : 'Parse error'}`
      };
    }
  }

  /**
   * Import from simple text list
   */
  static importFromTextList(content: string, fileName?: string): ImportResult {
    try {
      const lines = content.trim().split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length === 0) {
        return { success: false, error: 'Text file is empty or contains no valid entries' };
      }

      const tableRows: MinMaxRow[] = lines.map((line, index) => ({
        min: index + 1,
        max: index + 1,
        description: line
      }));

      const tableName = fileName ? fileName.replace(/\.(txt|text)$/i, '') : 'Text List';
      const table: RandomTable = {
        name: tableName,
        description: `Imported from ${fileName || 'text file'}`,
        diceFormula: `1d${lines.length}`,
        table: tableRows
      };

      return { success: true, table };
    } catch (error) {
      return {
        success: false,
        error: `Text parsing error: ${error instanceof Error ? error.message : 'Parse error'}`
      };
    }
  }

  /**
   * Try to determine format and import
   */
  static importFromUnknownFormat(content: string, fileName?: string): ImportResult {
    // Try JSON first
    try {
      JSON.parse(content);
      return this.importFromJSON(content, fileName);
    } catch {}

    // Try CSV if it has commas and multiple lines
    if (content.includes(',') && content.split('\n').length > 1) {
      return this.importFromCSV(content, fileName);
    }

    // Default to text list
    return this.importFromTextList(content, fileName);
  }

  /**
   * Validate table data structure
   */
  static validateTableData(data: any): ImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push('Table data must be an object');
      return { isValid: false, errors, warnings };
    }

    if (!data.name || typeof data.name !== 'string') {
      errors.push('Table must have a valid name');
    }

    if (!data.table || !Array.isArray(data.table)) {
      errors.push('Table must have a table array');
    } else if (data.table.length === 0) {
      errors.push('Table must have at least one row');
    } else {
      // Validate table rows
      data.table.forEach((row: any, index: number) => {
        if (typeof row !== 'object' || row === null) {
          errors.push(`Row ${index + 1}: Must be an object`);
          return;
        }

        if (!('description' in row) || typeof row.description !== 'string') {
          errors.push(`Row ${index + 1}: Must have a description`);
        }

        if (row.description === '') {
          warnings.push(`Row ${index + 1}: Empty description`);
        }
      });
    }

    if (!data.diceFormula || typeof data.diceFormula !== 'string') {
      warnings.push('Missing or invalid dice formula, will be generated automatically');
    }

    if (!data.description || typeof data.description !== 'string') {
      warnings.push('Missing description, will use default');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Normalize imported table data
   */
  static normalizeTable(data: any, fileName?: string): RandomTable {
    return {
      name: data.name || fileName?.replace(/\.(json|csv|txt)$/i, '') || 'Imported Table',
      description: data.description || `Imported from ${fileName || 'file'}`,
      diceFormula: data.diceFormula || this.generateDiceFormula(data.table),
      table: data.table.map((row: any) => ({
        min: row.min ?? null,
        max: row.max ?? null,
        description: row.description || ''
      })),
      consumable: data.consumable || false
    };
  }

  /**
   * Generate appropriate dice formula for table
   */
  static generateDiceFormula(rows: MinMaxRow[]): string {
    if (!rows || rows.length === 0) return '1d6';
    
    // Find the highest max value
    let maxValue = 0;
    for (const row of rows) {
      const max = typeof row.max === 'number' ? row.max : (typeof row.min === 'number' ? row.min : 0);
      if (max > maxValue) {
        maxValue = max;
      }
    }

    return maxValue > 0 ? `1d${maxValue}` : `1d${rows.length}`;
  }

  /**
   * Parse a number from string, handling various formats
   */
  static parseNumber(value: string): number | string | null {
    if (!value || value.trim() === '') return null;
    
    const trimmed = value.trim();
    const num = parseInt(trimmed, 10);
    
    if (!isNaN(num)) return num;
    
    // Return as string for non-numeric values (like "+0", "-5", etc.)
    return trimmed;
  }

  /**
   * Parse CSV line handling quoted values
   */
  static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Read file content as text
   */
  static readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}