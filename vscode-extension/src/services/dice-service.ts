export interface DiceResult {
  total: number;
  breakdown?: string;
  rolls: number[];
}

export class DiceService {
  roll(notation: string): DiceResult {
    const parsed = this.parseDiceNotation(notation);
    if (!parsed) {
      // Default to d20 if parsing fails
      const roll = Math.floor(Math.random() * 20) + 1;
      return { total: roll, rolls: [roll] };
    }

    const { numDice, sides, modifier, operator } = parsed;
    const rolls: number[] = [];
    let total = 0;

    // Roll the dice
    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      total += roll;
    }

    // Apply modifier
    if (operator === '+') {
      total += modifier;
    } else if (operator === '-') {
      total -= modifier;
    }

    // Create breakdown string
    let breakdown = '';
    if (numDice > 1) {
      breakdown = `[${rolls.join('+')}]`;
      if (modifier !== 0) {
        breakdown += ` ${operator}${modifier}`;
      }
    } else if (modifier !== 0) {
      breakdown = `${rolls[0]} ${operator}${modifier}`;
    }

    return {
      total,
      breakdown: breakdown || undefined,
      rolls
    };
  }

  private parseDiceNotation(notation: string): {
    numDice: number;
    sides: number;
    modifier: number;
    operator: string;
  } | null {
    // Handle formats like: 1d20, 3d6+2, 2d10-1, d6 (defaults to 1d6)
    const cleanNotation = notation.trim().toLowerCase();
    
    // Add default 1 if notation starts with 'd'
    const fullNotation = cleanNotation.startsWith('d') ? '1' + cleanNotation : cleanNotation;
    
    const match = fullNotation.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/);
    if (!match) return null;

    const [, numDiceStr, sidesStr, operator, modifierStr] = match;
    
    return {
      numDice: parseInt(numDiceStr, 10),
      sides: parseInt(sidesStr, 10),
      modifier: modifierStr ? parseInt(modifierStr, 10) : 0,
      operator: operator || '+'
    };
  }

  // Roll multiple different dice at once
  rollMultiple(notations: string[]): { [notation: string]: DiceResult } {
    const results: { [notation: string]: DiceResult } = {};
    
    for (const notation of notations) {
      results[notation] = this.roll(notation);
    }
    
    return results;
  }

  // Common gaming dice shortcuts
  rollAdvantage(): DiceResult {
    const roll1 = this.roll('1d20');
    const roll2 = this.roll('1d20');
    const higher = Math.max(roll1.total, roll2.total);
    
    return {
      total: higher,
      breakdown: `Advantage: ${roll1.total}, ${roll2.total} → ${higher}`,
      rolls: [roll1.total, roll2.total]
    };
  }

  rollDisadvantage(): DiceResult {
    const roll1 = this.roll('1d20');
    const roll2 = this.roll('1d20');
    const lower = Math.min(roll1.total, roll2.total);
    
    return {
      total: lower,
      breakdown: `Disadvantage: ${roll1.total}, ${roll2.total} → ${lower}`,
      rolls: [roll1.total, roll2.total]
    };
  }
}
