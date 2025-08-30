import type { SvelteComponent } from "svelte";
import type { LogLevel } from "vite";

export interface RandomTable {
  name: string;
  description: string;
  diceFormula: string;
  table: MinMaxRow[];
  consumable?: boolean;
}

export interface CustomTableList{
  [key: string]: RandomTable;
}

export interface MinMaxRow {
  min: number | string | null;
  max: number | string | null;
  description: string | Function;
}

export interface Content {
  [timestamp: number]: ContentData;
};

export interface ContentData {
  output: string;
  type: ContentType;
  input?: string;
};

export type ContentType = 'start' | 'task' | 'oracle' | 'keyword' | 'input'| 'roll' | 'table' | 'template' | 'llm';

export type ThemeName = 'light' | 'dark' | 'nord' | 'dracula' | 'gruvbox' | 'solarized';

export interface ThemeColors {
  // Base colors
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  
  // Element colors
  border: string;
  input: string;
  button: string;
  buttonHover: string;
  
  // State colors
  disabled: string;
  focus: string;
  
  // Additional colors for specific themes
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

export interface SettingPage {
  name: string;
  component: SvelteComponent;
};

export type CustomTableViews = 'create' | 'import' | 'export' | 'bulk' | 'search' | 'view' | ''

export interface Template {
  name: string;
  description: string;
  content: string;
  category: string;
  created: number;
  updated: number;
  // LLM Template Expander fields
  llmInstructions?: string;
  llmEnabled?: boolean;
  appendMode?: boolean;
  repositoryTarget?: string;
}

export interface TemplateList {
  [key: string]: Template;
}

export type TemplateViews = 'create' | 'import' | 'export' | 'view' | ''

export interface MapData {
  start: string;
  current: string;
  objective: Objective;
  map: { [key: string]: MapItem };
  
}

export interface Objective {
  type: QuestType;
  name: string;
  creature?: Creature;
  source?: string;
}

export const questTypes = ['find', 'deliver', 'defeat', 'collect', 'investigate', 'hunt', 'explore'] as const
export type QuestType = typeof questTypes[number]

export interface MapItem {
  name: string;
  location: MapLocation;
  icon: string;
  visible: boolean;
}

export interface MapLocation {
  row: number;
  col: number;
}

export type Level = 'high' | 'low' | 'no';

const settingTypes = [ 'wilderness', 'urban', 'underground', 'space', 'dungeon', 'sea' ] as const;
type SettingTypes = typeof settingTypes[number];

export interface GameConfig {
  size: number; // default 5
  magic: Level;
  tech: Level;
  setting: SettingTypes;
}

export interface Creature {
  name?: string;
  level: number;
  type: string;
  motivation: string;
}

export interface LLMProfile {
  name: string;
  provider: 'openai' | 'mistral' | 'openrouter' | 'koboldcpp' | 'custom';
  apiKey: string;
  endpoint: string;
  model: string;
  systemPrompt?: string;
  authorNote?: string;
  settings: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    // KoboldCPP Advanced Sampling
    tfs?: number;
    topA?: number;
    topK?: number;
    minP?: number;
    typical?: number;
    // KoboldCPP Repetition Control
    repPen?: number;
    repPenRange?: number;
    samplerOrder?: number[];
    // KoboldCPP Dynamic Temperature
    dynatempRange?: number;
    dynatempExponent?: number;
    smoothingFactor?: number;
    // KoboldCPP Mirostat
    mirostat?: number;
    mirostatTau?: number;
    mirostatEta?: number;
    // KoboldCPP DRY (Don't Repeat Yourself)
    dryMultiplier?: number;
    dryBase?: number;
    dryAllowedLength?: number;
    drySequenceBreakers?: string[];
    // KoboldCPP XTC
    xtcThreshold?: number;
    xtcProbability?: number;
    // KoboldCPP Grammar & Constraints
    grammar?: string;
    bannedTokens?: string[];
    logitBias?: { [key: string]: number };
    memory?: string;
  };
  includeSystemContent: boolean;
  maxContextEntries: number;
  // Context size management
  maxContextSize?: number; // Manual configuration for non-KoboldCPP providers
  autoDetectContextSize?: boolean; // Auto-detect for KoboldCPP
  created: number;
  updated: number;
}

export interface LLMProfileList {
  [key: string]: LLMProfile;
}

export type LLMViews = 'create' | 'import' | 'export' | 'view' | ''

export interface RepositoryItem {
  name: string;
  description: string;
  keywords: string[];
  content: string;
  forceInContext: boolean;
  category: RepositoryCategory;
  created: number;
  updated: number;
}

export interface RepositoryList {
  [key: string]: RepositoryItem;
}

export type RepositoryCategory = 'Character' | 'Location' | 'Object' | 'Situation'

export type RepositoryViews = 'create' | 'import' | 'export' | 'view' | ''

