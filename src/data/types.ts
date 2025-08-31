import type { SvelteComponent } from "svelte";
import type { LogLevel } from "vite";

export interface RandomTable {
  name: string;
  description: string;
  diceFormula: string;
  table: MinMaxRow[];
  consumable?: boolean;
  // Enhanced table features
  enhanced?: boolean;
  relationships?: TableRelationship[];
  defaultRollOptions?: AdvancedRollOptions;
  indexedData?: TableIndexData;
}

export interface CustomTableList{
  [key: string]: RandomTable;
}

export interface MinMaxRow {
  min: number | string | null;
  max: number | string | null;
  description: string | Function;
  // Enhanced table row features
  modifiers?: TableModifier[];
  metadata?: TableEntryMetadata;
  id?: string;
}

// Enhanced Table System Interfaces
export interface TableModifier {
  type: 'conditional' | 'weighted' | 'sequential' | 'unique' | 'linked';
  condition?: string;         // JavaScript expression
  weight?: number;           // Probability multiplier  
  dependency?: string;       // Reference to other table/result
  parameters?: Record<string, any>;
}

export interface TableEntryMetadata {
  tags?: string[];
  category?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
  created?: number;
  updated?: number;
}

export interface TableRelationship {
  type: 'parent-child' | 'cross-reference' | 'conditional-chain';
  sourceTable: string;
  targetTable: string;
  condition?: string;
  parameters?: Record<string, any>;
  triggerCondition?: (result: TableResult, context: RollContext) => boolean;
}

export interface AdvancedRollOptions {
  rollType?: 'standard' | 'advantage' | 'disadvantage' | 'exploding' | 'reroll';
  rerollCondition?: string; // JavaScript expression for when to reroll
  advantageCount?: number;
  modifiers?: {
    bonus: number;
    multiplier: number;
    threshold: number;
  };
  maxRerolls?: number;
}

export interface TableIndexData {
  tagIndex: Map<string, Set<number>>;
  categoryIndex: Map<string, Set<number>>;
  rarityIndex: Map<string, Set<number>>;
  fullTextIndex: Map<string, Set<number>>;
  lastIndexed: number;
}

export interface RollContext {
  variables: Record<string, any>;
  previousResults: TableResult[];
  depth: number;
  storyId: string;
  rollId: string;
  customTables?: CustomTableList;
  sparkTables?: SparkTableList;
}

export interface TableResult {
  description: string;
  roll: any; // DiceRoll result
  tableId?: string;
  entryId?: string;
  metadata?: TableEntryMetadata;
  linkedResults?: TableResult[];
  rollOptions?: AdvancedRollOptions;
  context?: RollContext;
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

export type CustomTableViews = 'create' | 'import' | 'export' | 'bulk' | 'search' | 'view' | 'advanced' | ''

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
  llmProfile?: string; // Key of the specific LLM profile to use for this template
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
  // Repository Scoping System fields
  scope: 'chapter' | 'book' | 'shelf' | 'library';
  scopeContext: {
    chapterId?: string;
    bookId?: string; 
    shelfId?: string;
  };
  workbookTags: string[]; // Multiple workbook membership
}

export interface RepositoryList {
  [key: string]: RepositoryItem;
}

export type RepositoryCategory = 'Character' | 'Location' | 'Object' | 'Situation'

export type RepositoryViews = 'create' | 'import' | 'export' | 'view' | ''

// Library System Types
export interface Library {
  shelves: Record<string, Shelf>;
  settings: LibrarySettings;
}

export interface LibrarySettings {
  lastAccessedShelf?: string;
  lastAccessedBook?: string;
  created: number;
  updated: number;
}

export interface Shelf {
  id: string;
  name: string;
  bannerImage?: string;
  books: Record<string, Book>;
  createdAt: number;
  updatedAt: number;
}

export interface Book {
  id: string;
  name: string;
  coverImage?: string;
  chapters: Record<string, Chapter>;
  lastAccessedChapter?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  id: string;
  name: string;
  content: Content; // Using existing Content type
  createdAt: number;
  updatedAt: number;
}

// Workbook System Types
export interface Workbook {
  id: string;
  name: string;
  description?: string;
  stackId: string; // Which stack contains this workbook
  masterScope?: 'chapter' | 'book' | 'shelf' | 'library';
  masterScopeContext?: {
    chapterId?: string;
    bookId?: string;
    shelfId?: string;
  };
  tags: string[]; // Tags this workbook represents
  createdAt: number;
  updatedAt: number;
}

export interface Stack {
  id: string;
  name: string;
  workbooks: Record<string, Workbook>;
}

export interface WorkbookSystem {
  stacks: Record<string, Stack>;
}

// Repository Context for resolution
export interface RepositoryContext {
  chapterId?: string;
  bookId?: string;
  shelfId?: string;
}

// Repository resolution result
export interface ResolvedRepositoryItem {
  item: RepositoryItem;
  key: string;
  source: 'library' | 'shelf' | 'book' | 'chapter';
}

export interface KeywordResolution {
  keyword: string;
  items: ResolvedRepositoryItem[];
  concatenatedContent: string;
  hasConflicts: boolean;
}

// Spark Tables System Types
export interface SparkTable {
  name: string;
  source: string; // file path or 'built-in'
  entries: string[];
  lastModified: number;
  enabled: boolean;
  weight: number;
  oracleEnabled: boolean;
  sparksEnabled: boolean;
  categories: string[];
  isDefault: boolean;
}

export interface SparkTableList {
  [key: string]: SparkTable;
}

export interface SparkTableSettings {
  enabledTables: string[];
  oracleTables: string[];
  sparkTables: string[];
  defaultTableEnabled: boolean;
  defaultTableCount: number;
  keywordCount: number;
  includeTableNames: boolean;
  allowCrossover: boolean;
}

export interface SparkResult {
  keywords: string[];
  tableNames?: string[];
  timestamp: number;
}

// Performance and Caching Interfaces
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  ttl?: number;
}

export interface PerformanceMetrics {
  rollTime: number;
  evaluationTime: number;
  cacheHits: number;
  cacheMisses: number;
  tableLoads: number;
}

export interface WeightedEntry {
  entry: MinMaxRow;
  weight: number;
  conditionalWeights?: Array<{
    condition: string;
    weight: number;
  }>;
}

export interface ConditionalEvaluationResult {
  result: boolean;
  error?: string;
  evaluationTime: number;
}

export interface TableValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  enhancedFeatures?: {
    hasConditionals: boolean;
    hasRelationships: boolean;
    hasWeighting: boolean;
    hasMetadata: boolean;
  };
}

// LangChain Workflow Orchestration Types (Foundation)
export interface StoryModeChain {
  id: string;
  name: string;
  description: string;
  category: 'character' | 'world' | 'plot' | 'gaming' | 'analysis';
  nodes: ChainNode[];
  triggers: ChainTrigger[];
  outputs: ChainOutput[];
  created: number;
  updated: number;
  enabled: boolean;
  version?: string;
}

export interface ChainNode {
  id: string;
  type: 'llm' | 'prompt' | 'parser' | 'retriever' | 'memory' | 'custom';
  config: Record<string, any>;
  connections: string[]; // Connected node IDs
  position?: { x: number; y: number }; // For visual workflow builder
  label?: string;
  description?: string;
}

export interface ChainTrigger {
  event: 'manual' | 'content_added' | 'chapter_start' | 'oracle_roll' | 'template_expansion';
  conditions?: Record<string, any>;
  enabled: boolean;
}

export interface ChainOutput {
  id: string;
  type: 'text' | 'repository_item' | 'template' | 'metadata';
  target?: string; // Where to output (repository category, template name, etc.)
  format?: string;
}

export interface WorkflowExecution {
  id: string;
  chainId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  currentNode?: string;
  results: Record<string, any>;
  errors: WorkflowError[];
  progress: number; // 0-100
}

export interface WorkflowError {
  nodeId: string;
  error: string;
  timestamp: number;
  recoverable: boolean;
}

export interface ChainLibrary {
  [chainId: string]: StoryModeChain;
}

// Workflow Node Configurations
export interface LLMNodeConfig {
  profileId: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemMessage?: string;
}

export interface PromptNodeConfig {
  template: string;
  variables: Record<string, string>;
}

export interface ParserNodeConfig {
  type: 'json' | 'yaml' | 'regex' | 'custom';
  pattern?: string;
  schema?: Record<string, any>;
}

export interface RetrieverNodeConfig {
  source: 'repository' | 'content' | 'external';
  query: string;
  filters?: Record<string, any>;
  maxResults?: number;
}

export interface MemoryNodeConfig {
  type: 'buffer' | 'summary' | 'vector';
  capacity?: number;
  key?: string;
}

export interface CustomNodeConfig {
  scriptPath: string;
  parameters: Record<string, any>;
}

