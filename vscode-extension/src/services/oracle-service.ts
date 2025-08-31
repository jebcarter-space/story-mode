import type { RandomTable } from '../types';

// Ported from main app oracle tables
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

const keywords = [
  'mysterious', 'ancient', 'forbidden', 'hidden', 'sacred', 'cursed',
  'powerful', 'dangerous', 'magical', 'divine', 'demonic', 'ethereal',
  'betrayal', 'alliance', 'secret', 'treasure', 'enemy', 'friend',
  'journey', 'quest', 'discovery', 'loss', 'victory', 'defeat'
];

export interface OracleResult {
  answer: string;
  roll: number;
  keywords?: string[];
}

export class OracleService {
  queryOracle(question?: string): OracleResult {
    const roll = this.rollDice(20);
    const result = this.getResultFromTable(oracleTable, roll);
    
    let answer = typeof result.description === 'string' ? result.description : 'Unknown';
    
    // Add keywords for "and" or "but" results
    const resultKeywords: string[] = [];
    if (answer.includes('and') || answer.includes('but')) {
      resultKeywords.push(...this.getRandomKeywords(2));
    }
    
    return {
      answer,
      roll,
      keywords: resultKeywords.length > 0 ? resultKeywords : undefined
    };
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
    const result: string[] = [];
    const availableKeywords = [...keywords];
    
    for (let i = 0; i < count && availableKeywords.length > 0; i++) {
      const index = Math.floor(Math.random() * availableKeywords.length);
      result.push(availableKeywords.splice(index, 1)[0]);
    }
    
    return result;
  }
}
