import type { RepositoryItem, RepositoryList } from '../data/types';

export interface RepositoryImportResult {
  success: boolean;
  repositories?: RepositoryList;
  error?: string;
  warnings?: string[];
}

export interface RepositoryImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class RepositoryImporter {
  /**
   * Import repositories from a JSON file
   */
  static async importFromFile(file: File): Promise<RepositoryImportResult> {
    try {
      const content = await file.text();
      return this.importFromJSON(content, file.name);
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
  static importFromJSON(content: string, fileName?: string): RepositoryImportResult {
    try {
      const data = JSON.parse(content);
      
      // Handle array of repositories
      if (Array.isArray(data)) {
        const repositories: RepositoryList = {};
        const warnings: string[] = [];
        
        for (const item of data) {
          const validation = this.validateRepositoryData(item);
          if (!validation.isValid) {
            return { success: false, error: validation.errors.join(', '), warnings: validation.warnings };
          }
          
          const key = item.name.toLowerCase().replace(/\s+/g, '_');
          repositories[key] = this.normalizeRepository(item, fileName);
          warnings.push(...validation.warnings);
        }
        
        return { success: true, repositories, warnings };
      }
      
      // Handle single repository object containing multiple repositories
      if (data && typeof data === 'object' && !data.name) {
        const validation = this.validateRepositoriesData(data);
        if (!validation.isValid) {
          return { success: false, error: validation.errors.join(', '), warnings: validation.warnings };
        }
        
        const repositories: RepositoryList = {};
        for (const [key, item] of Object.entries(data)) {
          repositories[key] = this.normalizeRepository(item, fileName);
        }
        
        return { success: true, repositories, warnings: validation.warnings };
      }
      
      // Handle single repository
      const validation = this.validateRepositoryData(data);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', '), warnings: validation.warnings };
      }
      
      const key = data.name.toLowerCase().replace(/\s+/g, '_');
      const repositories: RepositoryList = {
        [key]: this.normalizeRepository(data, fileName)
      };
      
      return { success: true, repositories, warnings: validation.warnings };
    } catch (error) {
      return {
        success: false,
        error: `Invalid JSON format: ${error instanceof Error ? error.message : 'Parse error'}`
      };
    }
  }

  /**
   * Validate repositories data structure (object containing multiple repositories)
   */
  static validateRepositoriesData(data: any): RepositoryImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Data must be an object');
      return { isValid: false, errors, warnings };
    }

    for (const [key, item] of Object.entries(data)) {
      const itemValidation = this.validateRepositoryData(item);
      if (!itemValidation.isValid) {
        errors.push(`Repository "${key}": ${itemValidation.errors.join(', ')}`);
      }
      warnings.push(...itemValidation.warnings.map(w => `Repository "${key}": ${w}`));
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate repository data structure
   */
  static validateRepositoryData(data: any): RepositoryImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Repository must be an object');
      return { isValid: false, errors, warnings };
    }

    if (!data.name || typeof data.name !== 'string') {
      errors.push('Repository must have a name (string)');
    }

    if (!data.category || !['Character', 'Location', 'Object', 'Situation'].includes(data.category)) {
      errors.push('Repository must have a valid category (Character, Location, Object, or Situation)');
    }

    if (!data.content || typeof data.content !== 'string') {
      errors.push('Repository must have content (string)');
    }

    if (!data.description || typeof data.description !== 'string') {
      warnings.push('Repository should have a description');
    }

    if (!data.keywords || !Array.isArray(data.keywords)) {
      warnings.push('Repository should have keywords array');
    } else if (data.keywords.some((k: any) => typeof k !== 'string')) {
      warnings.push('All keywords should be strings');
    }

    if (data.forceInContext !== undefined && typeof data.forceInContext !== 'boolean') {
      warnings.push('forceInContext should be a boolean');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Normalize imported repository data
   */
  static normalizeRepository(data: any, fileName?: string): RepositoryItem {
    const now = Date.now();
    
    return {
      name: data.name || 'Unnamed Repository',
      description: data.description || '',
      content: data.content || '',
      category: data.category || 'Object',
      keywords: Array.isArray(data.keywords) ? data.keywords.filter((k: any) => typeof k === 'string') : [],
      forceInContext: typeof data.forceInContext === 'boolean' ? data.forceInContext : false,
      created: (typeof data.created === 'number' && data.created > 0) ? data.created : now,
      updated: (typeof data.updated === 'number' && data.updated > 0) ? data.updated : now,
      // Handle scoping fields with defaults
      scope: data.scope || 'library',
      scopeContext: data.scopeContext || {},
      workbookTags: Array.isArray(data.workbookTags) ? data.workbookTags.filter((t: any) => typeof t === 'string') : []
    };
  }
}