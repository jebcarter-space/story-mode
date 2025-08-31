import type { RandomTable } from '../types';
import { SparkTableManager } from './spark-table-manager';

// Oracle table for Yes/No answers with complications
const oracleTable: RandomTable = {
  name: "Oracle",
  description: "Yes/No questions with complications",
  diceFormula: "1d20",
  table: [
    { min: 1, max: 2, description: "No, and..." },
    { min: 3, max: 6, description: "No" },
    { min: 7, max: 9, description: "No, but..." },
    { min: 10, max: 11, description: "Maybe" },
    { min: 12, max: 14, description: "Yes, but..." },
    { min: 15, max: 18, description: "Yes" },
    { min: 19, max: 20, description: "Yes, and..." }
  ]
};

export interface OracleResult {
  answer: string;
  roll: number;
  keywords?: string[];
  interpretation?: string;
  question?: string;
  timestamp?: number;
}

export interface OracleHistory {
  question: string;
  result: OracleResult;
  timestamp: number;
}

export class OracleService {
  private history: OracleHistory[] = [];

  constructor(private sparkTableManager: SparkTableManager) {}

  queryOracle(question?: string): OracleResult {
    const roll = this.rollDice(20);
    const result = this.getResultFromTable(oracleTable, roll);
    
    let answer = typeof result.description === 'string' ? result.description : 'Unknown';
    
    // Always provide keywords for inspiration
    const resultKeywords: string[] = this.getRandomKeywords(2);
    
    // Generate interpretation with keywords
    const interpretation = this.generateInterpretation(answer, resultKeywords);
    
    const oracleResult: OracleResult = {
      answer,
      roll,
      keywords: resultKeywords,
      interpretation,
      question,
      timestamp: Date.now()
    };

    // Add to history if question provided
    if (question) {
      this.addToHistory(question, oracleResult);
    }
    
    return oracleResult;
  }

  getHistory(): OracleHistory[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  formatOracleResult(result: OracleResult, includeFormatting = true): string {
    if (!includeFormatting) {
      return `${result.answer} (${result.roll})`;
    }

    let formatted = `**Oracle:** ${result.question || 'Question'}\n`;
    formatted += `**Answer:** ${result.answer} *(${result.roll})*\n`;
    
    if (result.keywords && result.keywords.length > 0) {
      formatted += `**Keywords:** ${result.keywords.join(', ')}\n`;
    }
    
    if (result.interpretation) {
      formatted += `**Interpretation:** ${result.interpretation}\n`;
    }
    
    return formatted;
  }

  private addToHistory(question: string, result: OracleResult): void {
    this.history.push({
      question,
      result,
      timestamp: Date.now()
    });

    // Keep only last 20 entries
    if (this.history.length > 20) {
      this.history = this.history.slice(-20);
    }
  }

  private generateInterpretation(answer: string, keywords: string[]): string {
    const templates = {
      'Yes, and': [
        `The situation favors you, and it involves something ${keywords[0]} ${keywords[1] ? `and ${keywords[1]}` : ''}.`,
        `Success is certain, enhanced by ${keywords[0]} elements ${keywords[1] ? `with ${keywords[1]} undertones` : ''}.`,
        `Absolutely! The ${keywords[0]} nature of this brings ${keywords[1] ? `${keywords[1]} opportunities` : 'new possibilities'}.`
      ],
      'Yes, but': [
        `Success is likely, though complicated by ${keywords[0]} factors ${keywords[1] ? `and ${keywords[1]} influences` : ''}.`,
        `The outcome is positive, but beware of ${keywords[0]} complications ${keywords[1] ? `involving ${keywords[1]} elements` : ''}.`,
        `Yes, though the ${keywords[0]} aspect creates ${keywords[1] ? `${keywords[1]} challenges` : 'unexpected obstacles'}.`
      ],
      'Yes': [
        `A clear affirmative, with ${keywords[0]} influences at play ${keywords[1] ? `and ${keywords[1]} undertones` : ''}.`,
        `The answer is yes, guided by ${keywords[0]} forces ${keywords[1] ? `through ${keywords[1]} means` : ''}.`,
        `Definitely, with ${keywords[0]} energy surrounding this ${keywords[1] ? `and ${keywords[1]} implications` : ''}.`
      ],
      'No, but': [
        `The direct approach fails, yet ${keywords[0]} opportunities emerge ${keywords[1] ? `through ${keywords[1]} means` : ''}.`,
        `Failure in the obvious sense, but ${keywords[0]} alternatives present themselves ${keywords[1] ? `via ${keywords[1]} paths` : ''}.`,
        `Not as expected, though ${keywords[0]} possibilities arise ${keywords[1] ? `involving ${keywords[1]} elements` : ''}.`
      ],
      'No': [
        `A clear negative, influenced by ${keywords[0]} factors ${keywords[1] ? `and ${keywords[1]} circumstances` : ''}.`,
        `The answer is no, with ${keywords[0]} forces working against this ${keywords[1] ? `alongside ${keywords[1]} obstacles` : ''}.`,
        `Definitely not, due to ${keywords[0]} complications ${keywords[1] ? `and ${keywords[1]} interference` : ''}.`
      ],
      'No, and': [
        `Not only does it fail, but ${keywords[0]} complications arise ${keywords[1] ? `with ${keywords[1]} consequences` : ''}.`,
        `Definite failure, worsened by ${keywords[0]} setbacks ${keywords[1] ? `and ${keywords[1]} obstacles` : ''}.`,
        `Absolutely not! The ${keywords[0]} nature makes things worse ${keywords[1] ? `with ${keywords[1]} repercussions` : ''}.`
      ],
      'Maybe': [
        `Uncertain outcome, with ${keywords[0]} factors creating ambiguity ${keywords[1] ? `and ${keywords[1]} variables` : ''}.`,
        `The situation is unclear, influenced by ${keywords[0]} elements ${keywords[1] ? `and ${keywords[1]} possibilities` : ''}.`,
        `Perhaps, depending on how the ${keywords[0]} aspect unfolds ${keywords[1] ? `relative to ${keywords[1]} influences` : ''}.`
      ]
    };

    const relevantTemplates = templates[answer as keyof typeof templates] || [
      `The answer suggests ${keywords[0]} influences ${keywords[1] ? `connected to ${keywords[1]} aspects` : ''}.`,
      `This involves ${keywords[0]} elements ${keywords[1] ? `with ${keywords[1]} undertones` : ''}.`,
      `Consider the ${keywords[0]} nature of this situation ${keywords[1] ? `and its ${keywords[1]} implications` : ''}.`
    ];

    return relevantTemplates[Math.floor(Math.random() * relevantTemplates.length)];
  }

  private rollDice(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  private getResultFromTable(table: RandomTable, roll: number) {
    for (const row of table.table) {
      const min = typeof row.min === 'number' ? row.min : parseInt(row.min?.toString() || '0');
      const max = typeof row.max === 'number' ? row.max : parseInt(row.max?.toString() || '0');
      
      if (roll >= min && roll <= max) {
        return row;
      }
    }
    
    return table.table[0]; // Fallback
  }

  private getRandomKeywords(count: number = 2): string[] {
    // Always use SparkTableManager for keywords
    return this.sparkTableManager.generateKeywords(count, 'oracle');
  }
}
