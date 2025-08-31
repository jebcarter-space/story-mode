import type { RollContext, ConditionalEvaluationResult } from '../data/types';

/**
 * Safe conditional evaluator for table conditions
 * Evaluates JavaScript expressions in a controlled environment
 */
export class ConditionalEvaluator {
  private static readonly SAFE_GLOBALS = {
    Math,
    parseInt,
    parseFloat,
    Number,
    String,
    Boolean,
    Date,
    JSON,
    isNaN,
    isFinite,
  };

  private static readonly FORBIDDEN_PATTERNS = [
    /eval\s*\(/,
    /Function\s*\(/,
    /constructor/,
    /prototype/,
    /window/,
    /document/,
    /global/,
    /__proto__/,
    /import\s*\(/,
    /require\s*\(/,
    /process/,
    /setTimeout/,
    /setInterval/,
    /fetch/,
    /XMLHttpRequest/,
  ];

  /**
   * Evaluate a conditional expression in a safe environment
   */
  static evaluate(condition: string, context: RollContext): ConditionalEvaluationResult {
    const startTime = performance.now();
    
    try {
      // Security check - reject forbidden patterns
      for (const pattern of this.FORBIDDEN_PATTERNS) {
        if (pattern.test(condition)) {
          return {
            result: false,
            error: `Forbidden operation detected in condition: ${condition}`,
            evaluationTime: performance.now() - startTime,
          };
        }
      }

      // Create safe evaluation context
      const safeContext = this.createSafeContext(context);
      const result = this.evaluateInSafeContext(condition, safeContext);
      
      return {
        result: Boolean(result),
        evaluationTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        result: false,
        error: error instanceof Error ? error.message : String(error),
        evaluationTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Create a safe evaluation context with limited scope
   */
  private static createSafeContext(context: RollContext): Record<string, any> {
    const safeContext: Record<string, any> = {
      ...this.SAFE_GLOBALS,
      ...context.variables,
    };

    // Add helper functions for common operations
    safeContext.roll_count = context.previousResults?.length || 0;
    safeContext.depth = context.depth || 0;
    safeContext.story_id = context.storyId;
    
    // Add previous result helpers
    if (context.previousResults && context.previousResults.length > 0) {
      const lastResult = context.previousResults[context.previousResults.length - 1];
      safeContext.last_result = lastResult.description;
      safeContext.last_table = lastResult.tableId;
    }

    return safeContext;
  }

  /**
   * Evaluate expression using Function constructor with restricted scope
   */
  private static evaluateInSafeContext(expression: string, context: Record<string, any>): any {
    // Create parameter names and values
    const paramNames = Object.keys(context);
    const paramValues = paramNames.map(name => context[name]);
    
    // Wrap expression in a return statement if it's not already
    const wrappedExpression = expression.trim().startsWith('return ') 
      ? expression 
      : `return (${expression})`;

    // Create and execute the function
    const evalFunction = new Function(...paramNames, wrappedExpression);
    return evalFunction(...paramValues);
  }

  /**
   * Validate a conditional expression without executing it
   */
  static validate(condition: string): { isValid: boolean; error?: string } {
    try {
      // Check for forbidden patterns
      for (const pattern of this.FORBIDDEN_PATTERNS) {
        if (pattern.test(condition)) {
          return {
            isValid: false,
            error: `Forbidden operation detected: ${pattern.source}`,
          };
        }
      }

      // Try to parse as JavaScript (syntax check)
      // Create a dummy context for validation
      const dummyContext = {
        character_level: 1,
        party_size: 4,
        current_season: 'spring',
        story_progress: 0,
        character_class: 'fighter',
        location_type: 'tavern',
        roll_count: 0,
        depth: 0,
        last_result: 'test',
      };

      // Test compilation without execution
      const paramNames = Object.keys(dummyContext);
      const wrappedExpression = condition.trim().startsWith('return ') 
        ? condition 
        : `return (${condition})`;
      
      new Function(...paramNames, wrappedExpression);
      
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get available variables for condition building
   */
  static getAvailableVariables(): Record<string, string> {
    return {
      // Character variables
      character_level: 'Character level (number)',
      character_class: 'Character class (string)',
      party_size: 'Number of party members (number)',
      
      // Story variables
      story_progress: 'Story progress percentage (0-100)',
      current_season: 'Current season (spring, summer, autumn, winter)',
      location_type: 'Type of current location (string)',
      
      // Roll context variables
      roll_count: 'Number of previous rolls in this context',
      depth: 'Current nesting depth of table rolls',
      last_result: 'Description of the last table result',
      last_table: 'Name of the last table rolled on',
      
      // Global functions
      'Math.*': 'Math functions (Math.random(), Math.floor(), etc.)',
      'Number()': 'Convert to number',
      'String()': 'Convert to string',
      'parseInt()': 'Parse integer from string',
      'parseFloat()': 'Parse float from string',
    };
  }

  /**
   * Create example conditions for documentation
   */
  static getExampleConditions(): Record<string, string> {
    return {
      'Simple Level Check': 'character_level >= 5',
      'Class Condition': 'character_class === "wizard"',
      'Multiple Conditions': 'character_level >= 10 && party_size > 2',
      'Season Check': 'current_season === "winter"',
      'Progress Gate': 'story_progress >= 50',
      'Random Chance': 'Math.random() < 0.3',
      'Complex Logic': '(character_level >= 5 && current_season === "winter") || story_progress >= 75',
      'Previous Result': 'last_result.includes("sword")',
      'Roll Count': 'roll_count < 3',
      'Location Check': 'location_type === "dungeon" || location_type === "cave"',
    };
  }
}