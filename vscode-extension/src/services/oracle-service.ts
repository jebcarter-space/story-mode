import type { RandomTable } from '../types';
import { SparkTableManager } from './spark-table-manager';

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
  'journey', 'quest', 'discovery', 'loss', 'victory', 'defeat',
  'turgid', 'decayed', 'glitter', 'village', 'craft', 'guard', 'obligation', 
  'ruined', 'twisted', 'premonition', 'metal', 'gamble', 'sarcophagus', 'bell',
  'tunnel', 'armies', 'potential', 'target', 'singing', 'subliminal', 'camp',
  'wary', 'illuminate', 'door', 'damage', 'structure', 'fresh', 'hairpin',
  'important', 'device', 'fragmented', 'enthusiastic', 'surprise', 'runes',
  'luminescent', 'burial', 'obstinate', 'shame', 'blood', 'banter', 'trapped',
  'nobility', 'disastrous', 'gold', 'dream', 'title', 'warrant', 'damaged',
  'opening', 'pleasant', 'heat', 'shape', 'mother', 'silence', 'temperature',
  'thick', 'illusion', 'mirror', 'daughter', 'controller', 'medium', 'priest',
  'blustering', 'web', 'tedious', 'skin', 'candidate', 'luck', 'memory',
  'cloying', 'communion', 'pattern', 'clue', 'stray', 'disguise', 'investigate',
  'crypt', 'rotten', 'spoiled', 'clank', 'rites', 'smell', 'pilgrim',
  'courage', 'uncharacteristic', 'vacant', 'oppress', 'witness', 'rope',
  'health', 'seat', 'dungeon', 'toss', 'weather', 'brother', 'goods',
  'weakness', 'orbit', 'road', 'dance', 'parent', 'orb', 'noxious',
  'accomplice', 'demon', 'proposal', 'prehistoric', 'advance', 'indication',
  'rescue', 'diversion', 'garbage', 'food', 'family', 'girl', 'slime',
  'unthinking', 'slide', 'guidance', 'diseased', 'item', 'midnight', 'birth',
  'diary', 'original', 'carry', 'representative', 'mouth', 'fetid', 'spirit',
  'accident', 'bother', 'vessel', 'disease', 'slippery', 'curiosity', 'son',
  'fortune', 'operation', 'man', 'maximum', 'cover', 'turned', 'silver',
  'sleep', 'track', 'message', 'heart', 'rusty', 'republic', 'malodorous',
  'refuse', 'language', 'temple', 'faith', 'hefty', 'sentimental', 'fear',
  'skill', 'escape', 'king', 'ammunition', 'infectious', 'foliage', 'love',
  'slave', 'sundered', 'motive', 'natural', 'release', 'boy', 'guest',
  'hollow', 'argument', 'enchanted', 'weird', 'floating', 'calm', 'woman',
  'entertain', 'fluttering', 'knowledge', 'disciple', 'common', 'building',
  'valuable', 'admission', 'chill', 'change', 'sister', 'revealing',
  'delusional', 'instrument', 'success', 'woven', 'impact', 'moan',
  'vibration', 'foreknowledge', 'map', 'boon', 'bones', 'prize', 'equipment',
  'embrace', 'sceptre', 'question', 'costume', 'unsophisticated', 'give',
  'alcohol', 'reflect', 'itch', 'gap', 'effigy', 'manage', 'river', 'mould',
  'invite', 'tradition', 'curse', 'statue', 'scuttling', 'hole', 'identity',
  'lake', 'proof', 'wealth', 'protection', 'aftershock', 'sea', 'shoe',
  'teacher', 'downward', 'flee', 'foot', 'search', 'dimension', 'swear',
  'effect', 'storage', 'henchman', 'noise', 'government', 'step', 'alarm',
  'treacherous', 'glowing', 'rainbow', 'child', 'tidy', 'awful', 'demand',
  'ability', 'march', 'fugitive', 'explosion', 'ball', 'mammoth', 'student',
  'persecute', 'vision', 'area', 'history', 'ambition', 'champion', 'obsidian',
  'performance', 'payment', 'country', 'information', 'code', 'loot', 'storm',
  'command', 'symbol', 'familiar', 'endanger', 'persistent', 'undead',
  'wilderness', 'contradict', 'talk', 'book', 'arid', 'guide', 'portal',
  'enshrine', 'incongruous', 'ruler', 'sneak', 'well', 'rocky', 'speed',
  'possession', 'overexcited', 'nimble', 'gears', 'apocalypse', 'entice',
  'location', 'song', 'unnatural', 'technology', 'erratic', 'precious',
  'adventurers', 'negotiation', 'smoke', 'temper', 'enlarge', 'persuade',
  'scary', 'medicine', 'few', 'bridge', 'agreement', 'dripping', 'eye',
  'tale', 'cloud', 'angular', 'duty', 'water', 'check', 'unsafe', 'laugh',
  'rancid', 'fancy', 'celebration', 'energy', 'decrepit', 'suggestion',
  'twilight', 'deteriorating', 'gaping', 'implicate', 'force', 'wine',
  'request', 'saviour', 'dispute', 'fall', 'rambling', 'awake', 'employment',
  'music', 'rundown', 'dark', 'misty', 'confusion', 'warning', 'enlighten',
  'city', 'lounge', 'punish', 'crack', 'group', 'chain', 'native', 'patrol',
  'captive', 'secure', 'percussive', 'overexcited', 'decomposed', 'gossip',
  'unseen', 'prodigy', 'hide', 'dryrot'
];

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

  constructor(private sparkTableManager?: SparkTableManager) {}

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
    // Use SparkTableManager if available, otherwise fallback to hardcoded keywords
    if (this.sparkTableManager) {
      return this.sparkTableManager.generateKeywords(count, 'oracle');
    }

    // Fallback to hardcoded keywords
    const result: string[] = [];
    const availableKeywords = [...keywords];
    
    for (let i = 0; i < count && availableKeywords.length > 0; i++) {
      const index = Math.floor(Math.random() * availableKeywords.length);
      result.push(availableKeywords.splice(index, 1)[0]);
    }
    
    return result;
  }
}
